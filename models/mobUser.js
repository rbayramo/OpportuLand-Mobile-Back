const mongoose = require('mongoose')

const MobUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    fullname: { type: String, required: true },
    linkedIn: { type: String, required: false },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    experience: { type: Array, default: [] },
    languages: { type: Array, default: [] },
    skills: { type: Array, default: [] },
    coverLetter: { type: String, required: true },
    createdEmail: { type: String, required: true },
    resumeId: { type: String, required: true },
    appliedJobs: { type: Array, default: [] },
    appliedJobsCount: { type: Number, default: 0 },
    country: { type: String, required: true },
    excludedCompanies: { type: Array, default: [] },
    messages: { type: Array, default: [], required: false },
    planStatus: { type: String, required: true },
    applicationStatus: { type: String, required: true },
    yearsOfExperience: { type: Number, default: 0, required: true },
    personalEmail: {
      type: String,
      required: false,
    },
    userScore: { type: Number, default: 0, required: true },
    dailyGoal: { type: Number, default: 0, required: true },
    dailyApplied: { type: Number, default: 0, required: true },
    notificationEnabled: { type: Boolean, required: true },
    location: { type: [0, 0], required: true, default: [0, 0] },

    termsAndConditions: {
      type: [
        {
          status: { type: Boolean, required: true },
          date: { type: Date, required: true },
          version: { type: Number, default: 1 },
        },
      ],
      required: false,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('MobUser', MobUserSchema)
