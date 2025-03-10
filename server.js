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
const stripeRouter = require('./routes/stripeRouter');

const app = express();

// CORS configuration
app.use(cors({
    origin: ['https://www.myworthyideas.com', 'https://myworthyideas-257fec0e7d06.herokuapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Stripe webhook must be before JSON parsing middleware
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeService = require('./services/stripeService');

    try {
        console.log('Received webhook with signature:', sig);
        
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        console.log('Webhook event verified:', {
            type: event.type,
            id: event.id
        });

        await stripeService.handleWebhookEvent(event);
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(400).json({ message: error.message });
    }
});

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

// Mount routes on API router
apiRouter.use('/users', userRouter);
apiRouter.use('/ideas', ideaRouter);
apiRouter.use('/stripe/connect', stripeConnectRoutes);
apiRouter.use('/stripe', stripeRouter);

// Mount API router
app.use('/api', apiRouter);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from React build and catch-all route AFTER API routes
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, "client", "build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 6001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;