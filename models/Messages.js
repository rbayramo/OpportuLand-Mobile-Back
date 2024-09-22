const mongoose = require('mongoose');
const { update } = require('./mobUser');



const attachmentSchema = new mongoose.Schema({
  filename: String,
  sizeMB: String,
  _id: mongoose.Schema.Types.ObjectId,
});

const MessagesSchema = new mongoose.Schema({
  userId:mongoose.Schema.Types.ObjectId,
  messageId: String,
  resumeId:mongoose.Schema.Types.ObjectId,
  jobId: mongoose.Schema.Types.ObjectId,
  hrId: String,
  companyId: String,
  remote:String,
  from: String,
  to: String,
  subject: String,
  cc: String,
  attachment: { type: [attachmentSchema], default: [], required: false },
  body: String,
  jobName: String,
  references: String,
  read: { type: Boolean, default: true },
  seen: { type: Boolean, default: false },
  firstMessage: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Messages', MessagesSchema);
