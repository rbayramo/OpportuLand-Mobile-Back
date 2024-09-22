const SwipeHistory = require('../models/swipeHistory')
const User = require('../models/mobUser')
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const db = mongoose.connection

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



router.post('/log', verifyToken , async (req, res) => {
  const {jobId, swipedRight} = req.body
  try {
    const userId = req.userId; 
  //  console.log(userId,jobId, swipedRight )
    if (!userId || !jobId || typeof swipedRight !== 'boolean') {
      return res.status(400).json({ error: "userId, jobId, or swipedRight not provided" });
    }

    const newSwipe = new SwipeHistory({
      userId: mongoose.Types.ObjectId(userId),
      jobId: mongoose.Types.ObjectId(jobId),
      swipedRight: swipedRight,
    });

   await newSwipe.save();
   res.status(201).json({ message: 'Swipe logged successfully' });
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});


module.exports = router
