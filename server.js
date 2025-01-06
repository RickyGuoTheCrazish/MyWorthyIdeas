// Load environment variables first
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require("cookie-parser");
const authProtecter = require("./middlewares/auth");
const { globalLimiter } = require("./middlewares/rateLimiter");

const userRouter = require('./routes/userRouter');
const ideaRouter = require('./routes/ideaRouter');
const stripeConnectRoutes = require('./routes/stripeConnectRoutes');

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Connect to MongoDB
mongoose.connect(process.env.ATLAS_URL)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Create API router
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Mount routes on API router
apiRouter.use('/users', userRouter);
apiRouter.use('/ideas', ideaRouter);
apiRouter.use('/stripe/connect', stripeConnectRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
const PORT = process.env.PORT || 6001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;