// /middlewares/auth.js
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Get user
        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Email not verified" });
        }

        // Attach user to request
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

/**
 * Seller authentication middleware
 * Verifies user is a seller with a valid Stripe Connect account
 */
const sellerAuth = async (req, res, next) => {
    try {
        // First run normal auth
        await auth(req, res, async () => {
            const user = req.user;

            if (user.subscription !== 'seller') {
                return res.status(403).json({ 
                    message: "Only sellers can access this resource" 
                });
            }

            if (!user.stripeConnectAccountId) {
                return res.status(403).json({ 
                    message: "Stripe Connect account required" 
                });
            }

            if (!user.stripeConnectStatus.chargesEnabled) {
                return res.status(403).json({ 
                    message: "Stripe Connect account not fully setup" 
                });
            }

            next();
        });
    } catch (error) {
        console.error("Seller auth middleware error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Buyer authentication middleware
 * Verifies user is a buyer
 */
const buyerAuth = async (req, res, next) => {
    try {
        // First run normal auth
        await auth(req, res, async () => {
            const user = req.user;

            if (user.subscription !== 'buyer') {
                return res.status(403).json({ 
                    message: "Only buyers can access this resource" 
                });
            }

            next();
        });
    } catch (error) {
        console.error("Buyer auth middleware error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = { auth, sellerAuth, buyerAuth };
