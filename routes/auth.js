const router = require('express').Router()
const User = require('../models/mobUser')
const CryptoJS = require('crypto-js')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const btoa = require('btoa')
const db = mongoose.connection
const Imap = require('imap')
const { access } = require('fs')
let storedHashedPassword = ''

//Check Database
router.post('/checkUser', async (req, res) => {
  try {
    const { username, email, phone, linkedIn } = req.body
  // Check if user with the given username exists
    const userWithUserName = await db
      .collection('mobusers')
      .findOne({ username })
    if (userWithUserName) {
      return res.status(403).json({
        message: 'Username is already registered, please try another name',
      })
    }
   // Check if user with the given linkedIn name exists
    if (linkedIn && linkedIn.trim() !== '') {
      const userWithLinkedIn = await db
        .collection('mobusers')
        .findOne({ linkedIn })
      if (userWithLinkedIn) {
        return res.status(403).json({
          message:
            'LinkedIn name is already registered, please try another name',
        })
      }
    }

    // E-posta ile kayıtlı bir kullanıcı kontrolü
    const userWithEmail = await db.collection('mobusers').findOne({ email })
    if (userWithEmail) {
      return res.status(403).json({
        message: 'Email is already registered, please try another email',
      })
    }

    // Telefon numarası ile kayıtlı bir kullanıcı kontrolü
    const userWithPhone = await db.collection('mobusers').findOne({ phone })
    if (userWithPhone) {
      return res.status(403).json({
        message:
          'Phone number is already registered, please try another number',
      })
    }
    console.log('user can be created')
    // Hiçbir alan zaten kayıtlı değilse, kullanıcı oluşturulabilir
    res.status(200).json({ message: 'User can be created' })
  } catch (error) {
    console.error('Error checking user existence:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

//create E-mail
router.post('/create-email', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  storedHashedPassword = hashedPassword
  const requestData = new URLSearchParams()
  requestData.append('action', 'create')
  requestData.append('domain', process.env.DOMAIN)
  requestData.append('user', req.body.username)
  requestData.append('passwd', storedHashedPassword)
  requestData.append('passwd2', storedHashedPassword)
  requestData.append('quota', '0')
  requestData.append('limit', '7200')

  const getBasicAuthHeader = (username, password) => {
    const credentials = `${username}:${password}`
    const encodedCredentials = btoa(credentials) // Encode in Base64
    return `Basic ${encodedCredentials}`
  }

  const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args))

  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ error: 'Username or password is missing' })
  }
  const apiUrl = `https://${process.env.DA_HOST}:${process.env.DA_PORT}/CMD_API_POP?json=yes`

  try {
    // console.log('emailpass', storedHashedPassword)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: getBasicAuthHeader(
          process.env.DA_USERNAME,
          process.env.DA_PASSWORD
        ),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: requestData.toString(),
    })

    const data = await response.json()
    console.log(data)
    res.json(data)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

//Register
router.post('/register', async (req, res) => {
  try {
    if (!storedHashedPassword) {
      return res.status(400).json({ error: 'Password not set' })
    }
    const newUser = new User({
      username: req.body.username,
      fullname: req.body.fullname,
      email: req.body.email,
      phone: req.body.phone,
      experience: req.body.experience,
      languages: req.body.languages,
      skills: req.body.skills,
      coverLetter: req.body.coverLetter,
      createdEmail: req.body.createdEmail,
      resumeId: req.body.resumeId,
      linkedIn: req.body.linkedIn,
      location: req.body.location,
      appliedJobs: req.body.appliedJobs,
      appliedJobsCount: req.body.appliedJobsCount,
      country: req.body.country,
      excludedCompanies: req.body.excludedCompanies,
      planStatus: req.body.planStatus,
      applicationStatus: req.body.applicationStatus,
      yearsOfExperience: req.body.yearsOfExperience,
      userScore: req.body.userScore,
      dailyApplied: req.body.dailyApplied,
      dailyGoal: req.body.dailyGoal,
      messages: req.body.messages,
      notificationEnabled: req.body.notificationEnabled,
      termsAndConditions: req.body.termsAndConditions,
      password: storedHashedPassword,
    })

    const savedUser = await newUser.save() 

    let accessToken = ''
    try {
      accessToken = jwt.sign({ id: savedUser._id }, process.env.JWT_SEC, {
        expiresIn: '365d',
      })
      console.log(accessToken)
    } catch (jwtError) {
      console.error('JWT Error:', jwtError.message)
      return res.status(500).json({ error: 'Failed to generate access token' })
    }

    console.log(accessToken, savedUser)

    res.status(201).json({
      message: 'User successfully created',
      user: savedUser,
      accessToken,
    })
  } catch (err) {
    // Handle errors
    console.error('Error creating user:', err)

    res.status(500).json({ error: 'An error occurred while creating the user' })
  }
})

//Login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.name })
    if (!user) {
      return res.status(401).json('Wrong User Name')
    }
    const match = await bcrypt.compare(req.body.password, user.password)
    if (!match) {
      return res.status(401).json({ message: 'Wrong password' })
    }
    const generatedToken = jwt.sign({ id: user._id }, process.env.JWT_SEC, {
      expiresIn: '365d',
    })
    const { accessToken, ...others } = user._doc
    res.status(200).json({ accessToken: generatedToken, ...others })
  } catch (err) {
    console.error(err)
    res.status(500).json('Server error')
  }
})

// router.post('/unseen', async (req, res) => {
//   const { username, password } = req.body;
//  // console.log(username, password);

//   try {
//     const imapConfig = {
//       user: `${username}@remote-auto.com`,
//       password: password,
//       host: 'wednesday.mxrouting.net',
//       port: 993,
//       tls: true,
//       tlsOptions: { rejectUnauthorized: false },
//     };

//     const imap = new Imap(imapConfig);

//     imap.once('ready', () => {
//       imap.openBox('INBOX', true, (err, box) => {
//         if (err) {
//           console.error('Error opening mailbox:', err);
//           res.status(500).json({ error: 'Internal Server Error' });
//           return;
//         }
//         imap.search(['UNSEEN'], (searchErr, results) => {
//           if (searchErr) {
//             console.error('Error searching for unseen emails:', searchErr);
//             res.status(500).json({ error: 'Internal Server Error' });
//             return;
//           }

//           const numUnseenMsgs = results.length;
//          // console.log(`You have ${numUnseenMsgs} unseen message.`);
//           res.status(200).json(`You have ${numUnseenMsgs} unseen message.`);
//           imap.end();
//         });
//       });
//     });

//     imap.once('error', (err) => {
//       console.error('IMAP connection error:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//     });

//     imap.once('end', () => {
//       console.log('imap connection ended.');
//     });
//     imap.connect();
//   } catch (error) {
//     console.error('Error in try-catch block:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

module.exports = router
