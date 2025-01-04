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
app.use(cors({
    origin: 'http://localhost:3000', // React app URL
    credentials: true
}));

// Increase JSON payload limit to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cookieParser());

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Routes
app.use('/api/users', userRouter);
app.use('/api/ideas', ideaRouter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use(express.static(path.join(__dirname, "client", "build")))
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client", "build", "index.html"));
// });

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});