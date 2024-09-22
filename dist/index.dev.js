"use strict";

var express = require("express");

var https = require("https"); // Import the 'https' module


var fs = require("fs"); // Import the 'fs' module to read files


var app = express();

var mongoose = require("mongoose");

var dotenv = require("dotenv");

var userRoute = require("./routes/user");

var authRoute = require("./routes/auth");

var emailRoute = require("./routes/createEmail");

var uploadResumeRoute = require("./routes/uploadResume");

var jobsRoute = require("./routes/jobs");

var cors = require("cors");

var bodyParser = require("body-parser");

dotenv.config();
mongoose.connect(process.env.MONGO_URL).then(function () {
  return console.log("DB Connection Successful!");
})["catch"](function (err) {
  console.log(err);
});
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/email", emailRoute);
app.use("/api/upload", uploadResumeRoute);
app.use("/api/jobs", jobsRoute);
process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
}); // Read SSL certificate and private key files

var sslOptions = {
  key: fs.readFileSync("C:/Users/Aydan/Desktop/ssl-test/privkey.pem"),
  cert: fs.readFileSync("C:/Users/Aydan/Desktop/ssl-test/fullchain.pem")
}; // Read SSL certificate and private key files
// const sslOptions = {
//   key: fs.readFileSync("/etc/letsencrypt/live/remote-auto.com/privkey.pem"),
//   cert: fs.readFileSync("/etc/letsencrypt/live/remote-auto.com/fullchain.pem")
// };
// Create an HTTPS server

var httpsServer = https.createServer(sslOptions, app); // Listen on the specified port for HTTPS

httpsServer.listen(process.env.PORT || 5050, function () {
  console.log("Backend server is running over HTTPS!");
});