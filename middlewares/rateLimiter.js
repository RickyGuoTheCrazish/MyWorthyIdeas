const rateLimit = require('express-rate-limit');

// Global limiter - applies to all routes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth routes limiter - stricter limits for auth-related routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per hour
    message: 'Too many login attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// Idea creation limiter
const ideaCreationLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 50, // Limit each IP to 50 idea creations per day
    message: 'You have reached the daily limit for creating ideas',
    standardHeaders: true,
    legacyHeaders: false,
});

// Idea purchase limiter
const ideaPurchaseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 purchases per hour
    message: 'Too many purchase attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter,
    ideaCreationLimiter,
    ideaPurchaseLimiter
};
