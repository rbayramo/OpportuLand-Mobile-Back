const mongoose = require('mongoose');

const SwipeHistorySchema = new mongoose.Schema({
  userId:mongoose.Schema.Types.ObjectId,
  jobId: mongoose.Schema.Types.ObjectId,
  swipedRight:Boolean,
}, { timestamps: true });

module.exports = mongoose.model('SwipeHistory', SwipeHistorySchema);
