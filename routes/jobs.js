const express = require("express");
const router = express.Router();
const Jobs = require("../models/Jobs");
const User = require("../models/mobUser");
const SwipeHistory = require("../models/swipeHistory");
const jwt = require("jsonwebtoken");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const decode = jwt.verify(token, process.env.JWT_SEC);
    const user = await User.findById(decode.id);
    if (user) {
      req.userId = decode.id;
      next();
    } else {
      return res.status(401).json("You are not authenticated");
    }
  } else {
    return res.status(401).json("You are not authenticated");
  }
};

//all jobs
router.get("/all", async (req, res) => {
  try {
    const jobs = await Jobs.find().limit(10);
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error." });
  }
});

router.get("/filter", verifyToken, async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * 10;
    const location = req.query.location;

    const authenticatedUserId = req.userId;

    const userSwipeHistory = await SwipeHistory.find(
      { userId: authenticatedUserId },
      { jobId: 1, _id: 0 }
    );

    const swipedJobIds = userSwipeHistory?.map((entry) => entry.jobId);

    let jobs = [];
    let totalJobs = 0;

    console.log("search", searchQuery);
    const extendedQuery = { job_status: "active", _id: { $nin: swipedJobIds } };

    //location
    if (location) {
      console.log("location", location);
      const jobLocation = {
        ...extendedQuery,
        location: { $regex: location, $options: "i" },
        remote_status: "local",
      };
      totalJobs = await Jobs.countDocuments(jobLocation);
      jobs = await Jobs.find(jobLocation);

      if (jobs?.length > 10) {
        jobs = await Jobs.find(jobLocation).skip(skip).limit(10);
      }

      jobs?.map((a) => console.log("location jobs", a.job_name, a.location)); //isleyir

      //location + search
      if (searchQuery) {
        console.log("search", searchQuery);
        const jobNameQuery = {
          ...extendedQuery,
          job_name: { $regex: searchQuery, $options: "i" },
          location: { $regex: location, $options: "i" },
        };

        const jobDescriptionQuery = {
          ...extendedQuery,
          job_description: { $regex: searchQuery, $options: "i" },
          location: { $regex: location, $options: "i" },
        };

        const jobNameResults = await Jobs.find(jobNameQuery)
          .skip(skip)
          .limit(10);
        const jobDescriptionResults = await Jobs.find(jobDescriptionQuery)
          .skip(skip)
          .limit(10);

        const combinedResults = [...jobNameResults];
        jobDescriptionResults.forEach((job) => {
          if (!combinedResults.some((result) => result._id.equals(job._id))) {
            combinedResults.push(job);
          }
        });

        jobs = combinedResults;
        totalJobs = await Jobs.countDocuments({
          $or: [jobNameQuery, jobDescriptionQuery],
        });
        jobs?.map((job) =>
          console.log("search +location", job.job_name, job.location)
        );
      }

      // remote search
    } else if (searchQuery && !location) {
      console.log("search", searchQuery);
      const jobNameQuery = {
        ...extendedQuery,
        job_name: { $regex: searchQuery, $options: "i" },
        remote_status: "remote",
      };
      console.log(jobNameQuery);

      const jobDescriptionQuery = {
        ...extendedQuery,
        job_description: { $regex: searchQuery, $options: "i" },
        remote_status: "remote",
      };

      const jobNameResults = await Jobs.find(jobNameQuery).skip(skip).limit(10);
      jobNameResults?.map((job) =>
        console.log("name", console.log(job.job_name, job.location))
      );
      const jobDescriptionResults = await Jobs.find(jobDescriptionQuery)
        .skip(skip)
        .limit(10);

      const combinedResults = [...jobNameResults];
      jobDescriptionResults.forEach((job) => {
        if (!combinedResults.some((result) => result._id.equals(job._id))) {
          combinedResults.push(job);
        }
      });
      jobs = combinedResults;
      totalJobs = await Jobs.countDocuments({
        $or: [jobNameQuery, jobDescriptionQuery],
      });
      jobs?.map((job) =>
        console.log("search", console.log(job.job_name, job.location))
      );
    } else {
      // default
      console.log("default");
      const defaultJobs = {
        ...extendedQuery,
        remote_status: "remote",
      };
      //console.log(extendedQuery)

      totalJobs = await Jobs.countDocuments(defaultJobs);
      jobs = await Jobs.find(defaultJobs).skip(skip).limit(10);
      // console.log(defaultJobs)
      //jobs?.map((a) => console.log(a?.name))
    }
    const remainingJobs = totalJobs - page * 10;

    console.log("totaljobs", totalJobs, "rema", remainingJobs);

    res.json({ data: jobs, total: totalJobs, remaining: remainingJobs });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

//search for id
router.get("/:id", async (req, res) => {
  try {
    const job = await Jobs.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json(job);
  } catch (err) {
    console.error("Server error:", err); // More specific log message
    res.status(500).json({ error: "Internal server error" });
  }
});

//search job

module.exports = router;
