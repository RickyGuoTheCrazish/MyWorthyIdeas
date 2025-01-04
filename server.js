const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const authProtecter = require("./middlewares/auth");
const { globalLimiter } = require("./middlewares/rateLimiter");

const ideaRouter = require("./routes/ideaRouter");
const userRouter = require("./routes/userRouter");
const PaymentController = require('./controllers/paymentController');
const paymentController = new PaymentController();

const app = express();
const cors = require("cors");

const port = process.env.PORT || 6001;
const path = require("path")

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000', // React app URL
    credentials: true
}));

// Handle webhook route before any body parsing middleware
app.post('/api/users/webhook', express.raw({type: '*/*'}), async (req, res) => {
    console.log('Webhook endpoint hit');
    try {
        await paymentController.handleWebhook(req, res);
    } catch (error) {
        console.error('Error in webhook endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Regular body parsing middleware for all other routes
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