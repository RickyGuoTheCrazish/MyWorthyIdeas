const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const StripeConnectService = require('./stripeConnectService');

const stripeConnectService = new StripeConnectService(stripe);

module.exports = {
    stripe,
    stripeConnectService
};
