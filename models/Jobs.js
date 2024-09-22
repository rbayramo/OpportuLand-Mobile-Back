const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  company: { type: String, required: true },
  company_website: { type: String, required: true },
  hr_name: { type: String, required: true },
  hr_email: { type: String, required: true },
  hr_linkedin: { type: String, required: true },
  hr_telegram: { type: String, required: true },
  job_name: { type: String, required: true },
  job_description: { type: String, required: true },
  job_category: { type: Array, required: true },
  job_status: { type: String, required: true },
  date_created: { type: Date, required: true },
  location: { type: String, required: true },
  remote_status: { type: String, required: true },
  english_level: { type: String, required: true },
  required_experience_years: { type: Number, required: true },
  job_source: { type: String, required: true },
  job_link: { type: String, required: true },
  hr_link: { type: String, required: true },
  company_link: { type: String, required: true },
  salary_range: { type: String, required: true },
  application_count: { type: Number, required: true },
});

module.exports = mongoose.model("jobs_v1", jobSchema);
