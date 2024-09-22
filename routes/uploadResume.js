const router = require('express').Router()
const mongoose = require('mongoose')
const multer = require('multer')
const { GridFSBucket } = require('mongodb')
const { ObjectId } = require('mongodb')
const fs = require('fs')
const pdf = require('pdf-parse')
const imapLib = require('imap')
const { simpleParser } = require('mailparser')

const db = mongoose.connection
const bucket = new GridFSBucket(db)

const storage = multer.memoryStorage()
const convert = multer({ storage })
const upload = multer({ storage })

router.post('/convertPdfToText', convert.single('file'), async (req, res) => {
console.log(req.file)
  try {
    const text = await pdfToText(req.file.buffer)
console.log("final text", text)
    res.status(200).send({ text })
  } catch (error) {
    console.error('Error processing PDF:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

async function pdfToText(data) {
console.log('pdftotext geldi')
  try {
    const pdfData = await pdf(data)
    if (!pdfData || !pdfData.numpages) {
      console.error('Invalid PDF document')
      throw new Error('Invalid PDF document')
    }
    const textArray = []
    for (let i = 1; i <= pdfData.numpages; i++) {
      const pageData = await pdf(data, { page: i })
      textArray.push(pageData.text)
    }
    const fullText = textArray.join('\n')
    const text = fullText.replace(/[\u0000-\u001F]/g, '')
console.log('makepost',text)
    return makePostRequest(text)
  } catch (error) {
    console.error('Error loading or processing PDF document:', error)
    throw error
  }
}

async function makePostRequest(text) {

   console.log('make postreq e gelen')
  const url = 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.CHATGPT4;

 
  const cleanedText = text.replace(/\[[^\]]+\]/g, (match) => {
  
    if (match === '[Job Applying]' || match === '[Company Applying]') {
      return match;
    }
    return '';
  });

  const data = {
    model: 'gpt-3.5-turbo-0125',
    messages: [
      {
        role: 'user',
        content:
          'Read the following text and return data in the following format, {fullname: fullname in text, skills: array made from skills mentioned in text, languages: array made from languages mentioned in text, experience: [{company: [company name in text], period: [from what time until what time], achievements: what was achieved in that particular job}], email: email in text, linkedIn: linkedIn in text, phone: phone number in text, coverLetter: create a detailed and appealing cover letter from text using variables: [Job Applying], [Company Applying] for the cover letter only use the these two variables enclosing with square brackets:.Start the cover letter with "Dear Hiring Manager,". The first line of the cover letter should be only "Dear Hiring Manager,".' +
          text,
      },
    ],
    temperature: 0.9,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const responseData = await response.json();
      return responseData.choices[0].message.content;
    } else {
      throw new Error('Request failed with status ' + response.status);
    }
  } catch (error) {
    console.error('Error:', error, 'please try again');
  }
}


router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const uploadStream = bucket.openUploadStream(req.file.originalname)
    uploadStream.end(req.file.buffer)
    const file = {
      filename: req.file.originalname,
      gridfs_id: uploadStream.id,
      uploaded_at: new Date(),
    }
    console.log("upload ", file)

    await db.collection('resumes').insertOne(file)
    res
      .status(200)
      .send({ message: 'File uploaded successfully.', resume: file })
  } catch (error) {
    console.error('Error uploading file:', error)
    res.status(500).send('Error uploading file.')
  }
})

//all resumes
router.get('/allResumes', async (req, res) => {
  try {
    const cursor = db.collection('fs.files').find({})
    cursor.toArray((err, files) => {
      if (err) {
        console.error('Error:', err)
        client.close()
        return
      }

      console.log('collection fs.files resumes:', files)
      client.close()
    })
    res.status(200).send(resumes)
  } catch (error) {
    console.error('Error retrieving resumes:', error)
    res.status(500).send('Error retrieving resumes.')
  }
})

//find resume
router.get('/resume/:id', async (req, res) => {
  const id = req.params.id
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid ObjectId format' })
    return
  }

  try {
    const cursor = db.collection('fs.files').find({ _id: new ObjectId(id) })
    const file = await cursor.next()
    if (!file) {
      res.status(404).json({ error: 'CV not found' })
      return
    }

    res.status(200).json(file)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred while getting the CV' })
  }
})

//find resume chunks if id else email_id
router.get('/pdf/:id', async (req, res) => {
  const id = req.params.id

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Wrong ObjectId format' })
    return
  }

  try {
    const cursor = db
      .collection('fs.chunks')
      .find({ files_id: new ObjectId(id) })

    const fileData = []
    // const chunkSize = 1024

    while (await cursor.hasNext()) {
      const chunk = await cursor.next()
      fileData.push(chunk.data.buffer)
    }

    if (fileData.length === 0) {
      res.status(404).json({ error: 'we cant find pdf' })
      return
    }

    const fullFileData = Buffer.concat(fileData)

    res.setHeader('Content-Type', 'application/pdf')
    res.status(200).send(fullFileData)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error' })
  }
})

// download pdf from email server
router.post('/downloadFromServer', async (req, res) => {
  const { id, user, password, name } = req.body
  console.log(req.body)
  const imapConfig = {
    user: `${user}@remote-auto.com`,
    password: password,
    host: 'wednesday.mxrouting.net',
    port: 993,
    timeout: 100000,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  }
  const imap = new imapLib(imapConfig)

  imap.once('ready', () => {
    //console.log('IMAP connection ready');
    imap.openBox('INBOX', false, () => {
      const f = imap.fetch(id, { bodies: '' })
      f.on('message', (msg) => {
        //console.log('Message received');
        msg.on('body', (stream) => {
          // console.log('Body received');
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              imap.end()
              console.error('Error parsing mail: ' + err)
              return res.status(500).send('Error parsing mail')
            }
            const matchingAttachment = parsed.attachments.find(
              (attachment) => attachment.filename === name
            )
            if (matchingAttachment) {
              console.log(matchingAttachment)
              const content = matchingAttachment?.content

              const base64EncodedContent = content.toString('base64')

              const response = {
                filename: matchingAttachment.name,
                content: base64EncodedContent,
              }

              console.log(
                matchingAttachment.contentType,
                'matchingAttachment.contentType'
              )
              res.setHeader('Content-Type', matchingAttachment.contentType)
              res.send(response)
            } else {
              console.log('No matching attachments found')
              res.status(404).send('No matching attachments found')
            }

            imap.end()
          })
        })
      })
      f.once('error', (err) => {
        console.error('Fetch error: ' + err)
        imap.end()
        res.status(500).send('Fetch error')
      })
    })
  })

  imap.once('error', (err) => {
    console.error('IMAP connection error: ' + err)
    res.status(500).send('IMAP connection error')
  })

  imap.once('end', () => {
    //console.log('IMAP connection ended');
  })

  imap.connect()
})

//update resume
router.post('/updateResume', async (req, res) => {
  const oldGridfsId = req.body.oldResumeId
  const newGridfsId = req.body.newResumeId
  try {
    if (newGridfsId !== null && oldGridfsId !== null) {
      const oldResume = await db
        .collection('fs.files')
        .findOne({ _id: new ObjectId(oldGridfsId) })
      const newResume = await db
        .collection('fs.files')
        .findOne({ _id: new ObjectId(newGridfsId) })

      if (!oldResume || !newResume) {
        res.status(404).json({ error: 'Old or new resume not found.' })
        return
      }

      // Copy chunks from new resume to old resume.
      const newResumeChunksCursor = db
        .collection('fs.chunks')
        .find({ files_id: new ObjectId(newResume._id) })

      while (await newResumeChunksCursor.hasNext()) {
        const chunk = await newResumeChunksCursor.next()
        // Update the corresponding chunk in the old resume.
        await db.collection('fs.chunks').updateOne(
          { files_id: oldResume._id, n: chunk.n },
          {
            $set: {
              data: chunk.data,
            },
          }
        )
      }

      // Update file metadata in old resume.
      await db.collection('fs.files').updateOne(
        { _id: oldResume._id },
        {
          $set: {
            length: newResume.length,
            uploadDate: newResume.uploadDate,
            filename: newResume.filename,
          },
        }
      )

      // Delete the new resume from the database.
      await db.collection('fs.files').deleteOne({ _id: newResume._id })

      res.status(200).json({ message: 'Resume updated successfully.' })
    } else {
      res.status(400).json({
        error: 'Invalid request. Both old and new resume IDs are required.',
      })
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred while updating the CV.' })
  }
})

// write db attachments
router.post('/saveAttachments', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.')
  }

  try {
    const uploadStream = bucket.openUploadStream(req.file.originalname)
    uploadStream.write(req.file.buffer)
    uploadStream.end()
    uploadStream.on('finish', () => {
      bucket.find({ filename: req.file.originalname }).toArray((err, files) => {
        if (err) {
          return res.status(500).send(err)
        }
        if (!files || files.length === 0) {
          return res.status(404).send('File not found')
        }
        const file = files[0]
        res.status(200).json({
          message: 'File uploaded successfully',
          fileId: file._id,
          filename: file.filename,
        })
      })
    })

    uploadStream.on('error', (error) => {
      console.error('Error during upload:', error)
      res.status(500).json({ error: 'Error during file upload.' })
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred while updating the CV.' })
  }
})

module.exports = router
