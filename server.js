const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const authProtecter = require("./middlewares/auth");
const { globalLimiter } = require("./middlewares/rateLimiter");

const ideaRouter = require("./routes/ideaRouter");
const userRouter = require("./routes/userRouter");

const app = express();
const cors = require("cors");

const port = process.env.PORT || 6001;
const path = require("path")

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

app.use(cors(corsOptions))

app.use(express.json());

app.use(cookieParser());

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Use idea router without global auth (routes handle auth individually)
app.use("/api/ideas", ideaRouter);

app.use("/api/users", userRouter);

// app.use(express.static(path.join(__dirname, "client", "build")))
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client", "build", "index.html"));
// });

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});