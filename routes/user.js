const User = require('../models/mobUser')
const SwipeHistory = require('../models/swipeHistory')
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
//const mobUser = require('../models/mobUser')
const db = mongoose.connection

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, process.env.JWT_SEC)
      const user = await User.findById(decoded.id)
      if (!user) {
        return res.status(401).json('You are not authenticated')
      }
      req.userId = decoded.id
      next()
    } catch (error) {
      return res.status(403).json('Token is invalid or expired')
    }
  } else {
    return res.status(401).json('Authorization header missing')
  }
}

//GET USER
router.get('/find', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const { password, ...others } = user._doc

    // const cursor = db.collection("jobs").find({});
    // const jobs = await cursor.toArray();
    // const foundJobs = [];
    // const notFoundJobs = [];
    // user._doc.appliedJobs.forEach((appliedJob) => {
    //   const matchedJob = jobs.find(job => job._id.equals(new ObjectId(appliedJob[0])));
    //   if (matchedJob) {
    //     matchedJob.applyDate = appliedJob[1];
    //     foundJobs.push(matchedJob);

    //   } else {
    //     notFoundJobs.push(appliedJob[0]);
    //   }
    // });

    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json(err)
  }
})

//Get filter job with page
router.get('/userJobs', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const { password, ...others } = user._doc

    const page = parseInt(req.query.page) || 1
    const pageSize = 10

    const appliedJobIds = user._doc.appliedJobs?.map(
      (appliedJob) => new ObjectId(appliedJob[0])
    )

    const totalJobsCount = await db
      .collection('jobs')
      .countDocuments({ _id: { $in: appliedJobIds } })
    const totalPages = Math.ceil(totalJobsCount / pageSize)

    const foundJobs = await db
      .collection('jobs')
      .find({ _id: { $in: appliedJobIds } })
      .toArray()

    foundJobs.forEach((job) => {
      const applyDate = user._doc.appliedJobs.find(
        (appliedJob) => appliedJob[0].toString() === job._id.toString()
      )
      if (applyDate) {
        job.applyDate = applyDate[1]
      }
    })

    const today = new Date()
    const filteredJobs = foundJobs.filter((job) => {
      const jobApplyDate = new Date(job.applyDate)
      return jobApplyDate <= today
    })

    filteredJobs.sort((a, b) => {
      const dateA = new Date(a.applyDate)
      const dateB = new Date(b.applyDate)
      return dateB - dateA
    })

    const paginatedJobs = filteredJobs.slice(
      (page - 1) * pageSize,
      page * pageSize
    )

    res.status(200).json({ user: others, foundJobs: paginatedJobs, totalPages })
  } catch (err) {
    res.status(500).json(err)
  }
})

//filter all jobs for searching
router.get('/userAllJobs', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const { password, ...others } = user._doc

    const appliedJobIds = user._doc.appliedJobs?.map(
      (appliedJob) => new ObjectId(appliedJob[0])
    )

    const foundJobs = await db
      .collection('jobs')
      .find({ _id: { $in: appliedJobIds } })
      .toArray()

    foundJobs.forEach((job) => {
      const applyDate = user._doc.appliedJobs.find(
        (appliedJob) => appliedJob[0].toString() === job._id.toString()
      )
      if (applyDate) {
        job.applyDate = applyDate[1]
      }
    })

    const today = new Date()
    const filteredJobs = foundJobs.filter((job) => {
      const jobApplyDate = new Date(job.applyDate)
      return jobApplyDate <= today
    })

    filteredJobs.sort((a, b) => {
      const dateA = new Date(a.applyDate)
      const dateB = new Date(b.applyDate)
      return dateB - dateA
    })

    res.status(200).json({ user: others, foundJobs: filteredJobs })
  } catch (err) {
    res.status(500).json(err)
  }
})

//UPDATE USER
router.put('/update', verifyToken, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: req.body,
      },
      { new: true }
    )

    res.status(200).json(updatedUser)
  } catch (err) {
    res.status(500).json(err)
  }
})

//GET ALL USERS
router.get('/all', verifyToken, async (req, res) => {
  const query = req.query.new
  try {
    const users = query
      ? await User.find().sort({ _id: -1 }).limit(5)
      : await User.find()
    const filteredUsers = users?.map((user) => {
      const { password, ...others } = user._doc
      return others
    })
    res.status(200).json(filteredUsers)
  } catch (err) {
    res.status(500).json(err)
  }
})

//notification
router.put('/updateNotificationEnabled', verifyToken,async (req, res) => {

  try {
    const userId = req.userId; 
    const { notificationEnabled } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { notificationEnabled: notificationEnabled },
      { new: true } 
    );
  
    if (updatedUser) {
      res.json({ message: 'User updated successfully', updatedUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update error:', error); // Log any errors for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
});

//location
router.put('/updateLocation', async (req, res) => {
  try {
    const { username, location } = req.body;
   // console.log('Request body location:', req.body);

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $set: { location } },
      { new: true }
    );

    // console.log('Updated user:', updatedUser); // Log updated user for debugging

    if (updatedUser) {
      res.json({ message: 'User updated successfully', updatedUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update error:', error); // Log any errors for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
});


// //DELETE USER
// router.delete("/delete/:id", verifyToken, async (req, res) => {
//   try {
//     await User.findByIdAndDelete(req.params.id);
//     res.status(200).json("User has been deleted");
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

module.exports = router
