// messages.js
const User = require('../models/mobUser')
const Jobs = require('../models/Jobs')
const Messages = require('../models/Messages')
const SwipeHistory = require('../models/swipeHistory')
const router = require('express').Router()
const mime = require('mime-types')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const db = mongoose.connection

//token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    const decode = jwt.verify(token, process.env.JWT_SEC)
    const user = await User.findById(decode.id)

    if (user) {
      req.userId = decode.id
      next()
    } else {
      return res.status(401).json('You are not authenticated')
    }
  } else {
    return res.status(401).json('You are not authenticated')
  }
}

// //update User messages fields
// router.post('/update', verifyToken, async (req, res) => {
//   try {
//     const { userId, messageData } = req.body
//     await updateMobUsersMessages(userId, messageData)
//     res.status(200).send('Messages updated successfully')
//   } catch (error) {
//     console.error('Error updating messages:', error)
//     res.status(500).send('Internal Server Error')
//   }
// })

//Regular Application
router.post('/regularApplication', verifyToken, async (req, res) => {
  const { userEmail, userPassword, fullname, jobId } = req.body

  if (!userEmail || !userPassword || !fullname || !jobId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const user = await User.findOne({ username: userEmail })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const resumeFile = await fetchResumeFilename(user.resumeId)

    if (!resumeFile) {
      return res.status(404).json({ error: 'Resume filename not found' })
    }
    const { filename, chunkSize, _id } = resumeFile

    if (!user.coverLetter) {
      return res.status(404).json({ error: 'Cover letter not found' })
    }

    const emailTransporter = createEmailTransporter(
      userEmail,
      userPassword,
      fullname
    )
    const resumeBuffer = await fetchUserResume(user.resumeId)
    const jobDetails = await appliedJob(jobId)

    if (!jobDetails || !resumeBuffer) {
      return res.status(404).json({ error: 'Job details or resume not found' })
    }

    const personalizedCoverLetter = personalizeCoverLetter(
      user.coverLetter,
      jobDetails
    )
    const {
      job_name: jobName,
      hr_email: hrEmail,
      hr_name: hrName,
      company: companyName,
      remote_status: remote,
    } = jobDetails

    const mailOptions = createMailOptions(
      userEmail,
      personalizedCoverLetter,
      resumeBuffer,
      filename,
      fullname,
      jobName,
      hrEmail
    )

    const emailResult = await sendEmail(emailTransporter, mailOptions)
    const currentTime = new Date().toISOString()
    const chunkSizeInMB = chunkSize / (1024 * 1024)
    const sizeMB = chunkSizeInMB.toFixed(2)

    const newMessage = new Messages({
      messageId: emailResult?.messageId,
      userId: user._id,
      resumeId: user.resumeId,
      jobId: jobDetails._id,
      hrId: hrName,
      companyId: companyName,
      from: mailOptions.from,
      to: mailOptions.to,
      remote: remote,
      subject: mailOptions.subject,
      cc: '',
      attachment: [{ filename, sizeMB, _id }],
      body: personalizedCoverLetter,
      jobName: jobName,
      references: emailResult?.messageId,
      updated_at: currentTime,
      read: true,
      seen: false,
      firstMessage: true,
      createdAt: new Date(),
    })
    // console.log('first', newMessage)

    await newMessage.save()
    return res.status(200).json(newMessage)
  } catch (error) {
    console.error('Error:', error.message)
    return res
      .status(500)
      .json({ error: 'Internal server error', detailedError: error.message })
  }
})

//sendEmail
router.post('/sendEmail', verifyToken, async (req, res) => {
  const {
    userEmail,
    userPassword,
    fullname,
    attachments,
    message,
    subject,
    references,
  } = req.body

  if (!userEmail || !userPassword || !fullname) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const user = await User.findOne({ username: userEmail })
    const { fullname } = user

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    //file data
    const emailAttachmentsPromises = attachments?.map(async (attachment) => {
      const resumeFile = await fetchResumeFilename(attachment?.fileId)
      const resumeBuffer = await fetchUserResume(attachment?.fileId)

      if (resumeFile && resumeBuffer) {
        return {
          filename: resumeFile.filename,
          content: resumeBuffer.toString('base64'),
          encoding: 'base64',
          _id: resumeFile._id,
          chunkSize: resumeFile.chunkSize / (1024 * 1024).toFixed(2),
          contentType:
            mime.lookup(resumeFile.filename) || 'application/octet-stream',
        }
      } else {
        console.log(`Resume file not found for fileId: ${attachment.fileId}`)
        return null
      }
    })
    const emailAttachments = await Promise.all(emailAttachmentsPromises)
    const attachmentInfo = emailAttachments?.map((att) => {
      return {
        filename: att.filename,
        sizeMB: att.chunkSize / (1024 * 1024).toFixed(2),
        _id: att._id,
      }
    })

    //last message
    const lastMessage = await getLastMessage(user._id, references)
    //email transporter
    const emailTransporter = createEmailTransporter(
      userEmail,
      userPassword,
      fullname
    )
    // mail option
    const mailOptions = await createSendEmailMailOptions(
      userEmail,
      fullname,
      message,
      emailAttachments,
      subject,
      lastMessage
    )

    //time
    const currentTime = new Date().toISOString()

    const emailResult = await sendEmail(emailTransporter, mailOptions)

    //subject
    const subjectCleaned = lastMessage.subject.replace(/^Re: /i, '')

    const newMessage = new Messages({
      messageId: emailResult?.messageId,
      userId: user._id,
      from: mailOptions.from,
      to: mailOptions.to,
      subject: subjectCleaned,
      inreplyto: mailOptions.messageId,
      cc: mailOptions.cc,
      body: message,
      remote: lastMessage.remote,
      attachment: attachmentInfo,
      references: mailOptions.references,
      updated_at: currentTime,
      read: true,
      seen: false,
      firstMessage: false,
      updatedAt: new Date(),
    })
    await newMessage.save()

    await db.collection('messages').updateOne(
      {
        userId: user._id,
        subject: subjectCleaned,
        firstMessage: true,
      },
      {
        $set: { updatedAt: newMessage.updatedAt },
      }
    )

    return res.status(200).json(newMessage)
  } catch (error) {
    console.error('Error:', error.message)
    return res
      .status(500)
      .json({ error: 'Internal server error', detailedError: error.message })
  }
})

//create email transport
function createEmailTransporter(userEmail, userPassword, fullname) {
  return nodemailer.createTransport({
    host: process.env.DA_HOST,
    port: 465,
    secure: true,
    auth: {
      user: `${userEmail}@remote-auto.com`,
      pass: userPassword,
      name: fullname,
    },
  })
}

//fileName
async function fetchResumeFilename(resumeId) {
  const fileDoc = await db
    .collection('fs.files')
    .findOne({ _id: new ObjectId(resumeId) })

  if (fileDoc) {
    return {
      filename: fileDoc.filename,
      chunkSize: fileDoc.chunkSize,
      _id: fileDoc._id,
    }
  } else {
    return null
  }
}

//resume
async function fetchUserResume(resumeId) {
  const cursor = db
    .collection('fs.chunks')
    .find({ files_id: new ObjectId(resumeId) })
  const fileData = []
  while (await cursor.hasNext()) {
    const chunk = await cursor.next()
    fileData.push(chunk.data.buffer)
  }
  return fileData.length > 0 ? Buffer.concat(fileData) : null
}

//Job details
async function appliedJob(jobId) {
  try {
    const job = await db
      .collection('jobs_v1')
      .findOne({ _id: new ObjectId(jobId) })
    if (!job) {
      return null
    }

    const { hr_name, hr_email, company, job_name, _id, remote_status } = job

    return { hr_name, hr_email, company, job_name, _id, remote_status }
  } catch (error) {
    console.error('Error fetching job:', error)
  }
}

//coverLetter
function personalizeCoverLetter(coverLetterTemplate, jobDetails) {
  const jobPlaceholderRegex = /\[Job Applying\]/gi;
  const companyPlaceholderRegex = /\[Company Applying\]/gi;

  let personalizedCoverLetter = coverLetterTemplate.replace(
    companyPlaceholderRegex,
    jobDetails.company
  );

  personalizedCoverLetter = personalizedCoverLetter.replace(
    jobPlaceholderRegex,
    jobDetails.job_name
  );

  const greetingLine = jobDetails?.hr_name ? `Dear ${jobDetails.hr_name},\n` : '';
  // const final = `${greetingLine}${personalizedCoverLetter}`;
  const lines =personalizedCoverLetter.split(/\r?\n/);
  if (greetingLine) {
    lines[0] = greetingLine;
  }
  const modifiedText = lines.join("\n"); 
  return modifiedText;
}

//Helper function to create mail options
function createMailOptions(
  userEmail,
  personalizedCoverLetter,
  resumeBuffer,
  filename,
  fullname,
  jobName,
  hrEmail
) {
  
  return {
    from: `"${fullname}" <${userEmail}@remote-auto.com>`,
    to: hrEmail,
    //hrEmail || 'Hiring Manager',
    //'rashadbayramov815@gmail.com',
    subject: jobName, //
    text: personalizedCoverLetter,
    attachments: [
      {
        filename: filename,
        content: resumeBuffer,
        encoding: 'base64',
      },
    ],
  }
}

async function createSendEmailMailOptions(
  userEmail,
  fullname,
  message,
  emailAttachments,
  subject,
  lastMessage
) {
  let from = `"${fullname}" <${userEmail}@remote-auto.com>`

  if (lastMessage.from === from) {
    var to = lastMessage.to
    // var to = 'aydan2903@gmail.com'
    var cc = lastMessage.cc
  } else {
    to = lastMessage.from
    var cc = lastMessage.cc
      ? `${lastMessage.cc}, ${lastMessage.to}`
      : lastMessage.to
    cc = cc.replace(
      new RegExp(`${fullname} <${userEmail}@remote-auto.com>,`, 'g'),
      ''
    )
    cc = cc.replace(
      new RegExp(`${fullname} <${userEmail}@remote-auto.com>`, 'g'),
      ''
    )
  }

  const prepareAttachments = emailAttachments?.map((attachment) => {
    return {
      filename: attachment.filename,
      content: attachment.content,
      encoding: attachment.encoding,
      contentType: attachment.contentType,
    }
  })

  return {
    from: from,
    to: to,
    cc: cc,
    subject: `Re: ${subject}`,
    text: message,
    inReplyTo: lastMessage.messageId,
    references:
      lastMessage.firstMessage === true
        ? lastMessage.references
        : lastMessage.references + ' ' + lastMessage.messageId,
    attachments: prepareAttachments,
  }
}

//sendEmail
async function sendEmail(transporter, mailOptions) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error)
        reject(error)
      } else {
        resolve(info)
      }
    })
  })
}

async function getLastMessage(userId, references) {
  try {
    const lastMessage = await db.collection('messages').findOne(
      {
        userId: userId,
        references: {
          $regex: references,
          $options: 'i',
        },
      },
      {
        sort: { createdAt: -1 },
      }
    )

    if (!lastMessage) {
      console.log('No messages found')
      return null
    }

    return lastMessage
  } catch (error) {
    console.error('Error fetching last message:', error)
    return null
  }
}

// get messages
router.post('/getMessages', verifyToken, async (req, res) => {
  // console.log(req.query)
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * 10
    const username = req.body.username
    const location = req.body.location
    const buttonType = req.query.type
    const messageId = req.body.messageId

    // console.log(page)
    if (!username) {
      return res.status(400).json({ error: 'userId not provided' })
    }

    const user = await User.findOne({ username: username })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const messages = await Messages.find({
      userId: new ObjectId(user._id),
    })
      .skip(skip)
      .limit(limit)

    const allMessages = await Messages.find({
      userId: new ObjectId(user._id),
    })

    let query = { userId: new ObjectId(user._id) }
    if (messageId) {
      query['references'] = { $regex: messageId, $options: 'i' }
    }

    const messagesRef = await Messages.find(query)

    let filteredMessages = []

    if (buttonType) {
      allMessages?.forEach((message) => {
        if (buttonType === 'local' && message.remote === 'local') {
          filteredMessages.push(message)
        } else if (buttonType === 'remote' && message.remote === 'remote') {
          filteredMessages.push(message)
        }
      })
    } else {
      filteredMessages = messages
    }

    let finalMessages = [] //last reply

    filteredMessages.forEach((msg) => {
      let isReferenced = false

      for (let otherMsg of filteredMessages) {
        if (
          otherMsg.references &&
          otherMsg.references.includes(msg.messageId)
        ) {
          isReferenced = true
          break
        }
      }

      if (!isReferenced) {
        finalMessages.push(msg)
      } else {
        let referencedMessage = filteredMessages.find(
          (m) => m.references && m.references.includes(msg.messageId)
        )
        if (referencedMessage) {
          finalMessages.push(referencedMessage)
        }
      }
    })

    const totalMessagesCount = await Messages.countDocuments({
      userId: new ObjectId(user._id),
    })
    const remainingMess = totalMessagesCount - page * 10

    res.status(200).json({
      messages: filteredMessages,
      fullname: user?.fullname || '',
      remaining: remainingMess,
      referencesMessage: messagesRef,
      total: totalMessagesCount,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// update messages read status
router.post('/updateMessageReadStatus', verifyToken, async (req, res) => {
  const { messageId, newReadStatus } = req.body
  try {
    await Messages.findByIdAndUpdate(messageId, {
      $set: { read: newReadStatus },
    })
    res
      .status(200)
      .json({ message: 'Message read status updated successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
