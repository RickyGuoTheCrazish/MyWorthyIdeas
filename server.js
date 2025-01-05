// Load environment variables first
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cookieParser = require("cookie-parser");
const authProtecter = require("./middlewares/auth");
const { globalLimiter } = require("./middlewares/rateLimiter");
const StripeConnect = require('./db/stripeConnectModel');

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

// Webhook handling for Stripe Connect
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        // Update the connected account status in your database
        await StripeConnect.findOneAndUpdate(
          { stripeAccountId: account.id },
          {
            accountStatus: account.charges_enabled ? 'active' : 'pending',
            payoutsEnabled: account.payouts_enabled,
            chargesEnabled: account.charges_enabled,
            detailsSubmitted: account.details_submitted
          }
        );
        break;
      case 'checkout.session.completed':
        const session = event.data.object;
        // Handle successful payment
        if (session.metadata && session.metadata.type === 'idea_purchase') {
          // Update idea purchase status
          // You'll need to implement this based on your needs
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({error: 'Failed to handle webhook event'});
  }
});

// Routes
app.use('/api/users', userRouter);
app.use('/api/ideas', ideaRouter);
app.use('/api/stripe/connect', stripeConnectRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
const PORT = process.env.PORT || 6001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;