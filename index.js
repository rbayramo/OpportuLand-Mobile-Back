const express = require("express");
const https = require("https"); // Import the 'https' module
const fs = require("fs"); // Import the 'fs' module to read files
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");
const swipedHistoryRoute = require('./routes/swipedHistory')
const uploadResumeRoute = require("./routes/uploadResume")
const jobsRoute = require("./routes/jobs")
const messagesRoute = require("./routes/messages")
const cors = require("cors");
dotenv.config();



mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connection Successful!"))
  .catch((err) => {
    console.log(err);
  });
  

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoute);
app.use('/api/swipedHistory', swipedHistoryRoute)
app.use("/api/users", userRoute);
 app.use("/api/messages", messagesRoute);
app.use("/api/resume", uploadResumeRoute);
app.use("/api/jobs", jobsRoute )



//test 
process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
});

// Read SSL certificate and private key files
// const sslOptions = {
//   key: fs.readFileSync("C:/Users/Aydan/Desktop/privkey.pem"), 
//   cert: fs.readFileSync("C:/Users/Aydan/Desktop/fullchain.pem")
// };


// //Read SSL certificate and private key files
// const sslOptions = {
//   key: fs.readFileSync("/etc/letsencrypt/live/remote-auto.com/privkey.pem"),
//   cert: fs.readFileSync("/etc/letsencrypt/live/remote-auto.com/fullchain.pem")
// };




// Create an HTTPS server
//const httpsServer = https.createServer(sslOptions, app);

// Listen on the specified port for HTTPS
app.listen(5050, () => {
  console.log("Backend server is running over HTTPS!");
});

