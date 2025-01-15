const rateLimit = require('express-rate-limit');

// Create a custom middleware wrapper for rate limiters
const createRateLimiter = (options) => {
    const limiter = rateLimit({
        ...options,
        handler: (req, res) => {
            return res.status(429).json({
                status: 'error',
                message: options.message || 'Too many requests, please try again later'
            });
        },
        skipFailedRequests: false,
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Return a wrapper middleware
    return (req, res, next) => {
        // Ensure proper CORS headers are set
        res.setHeader('Access-Control-Allow-Origin', 'https://myworthyideas-257fec0e7d06.herokuapp.com');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        
        // Apply rate limiter
        limiter(req, res, next);
    };
};

// Global limiter - applies to all routes
const globalLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 500, // Increased from 100 to 500 requests per 10 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Auth routes limiter - made more lenient
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // Reduced from 1 hour to 15 minutes
    max: 20, // Increased from 5 to 20 requests per 15 minutes
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
});

// Idea creation limiter
const ideaCreationLimiter = createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 100, // Increased from 50 to 100 ideas per day
    message: 'You have reached the daily limit for creating ideas'
});

// Idea purchase limiter
const ideaPurchaseLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Increased from 10 to 30 purchases per hour
    message: 'Too many purchase attempts, please try again later'
});

module.exports = {
    globalLimiter,
    authLimiter,
    ideaCreationLimiter,
    ideaPurchaseLimiter
};
