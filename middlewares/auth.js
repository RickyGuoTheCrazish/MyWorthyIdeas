// /middlewares/auth.js
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");
const { UploadPartCopyRequestFilterSensitiveLog } = require("@aws-sdk/client-s3");

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

        // Attach token and decoded info to request
        req.token = token;
        req.userId = decoded.userId;
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
 * Helper function to get user info efficiently from database
 */
const getUserInfo = async (userId) => {
    // Only select the fields we need
    const user = await User.findById(userId)
        .select('username email subscription stripeConnectAccountId stripeConnectStatus isVerified')
        .lean(); // Use lean() for better performance
    
        console.log(UploadPartCopyRequestFilterSensitiveLog)
    if (!user) {
        throw new Error('User not found');
    }

    if (!user.isVerified) {
        throw new Error('Email not verified');
    }

    return user;
};

/**
 * Seller authentication middleware
 * Verifies user is a seller with a valid Stripe Connect account
 */
const sellerAuth = async (req, res, next) => {
    try {
        // First run normal auth
        await auth(req, res, async () => {
            try {
                const user = await getUserInfo(req.userId);

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

                if (!user.stripeConnectStatus?.chargesEnabled) {
                    return res.status(403).json({ 
                        message: "Stripe Connect account not fully setup" 
                    });
                }

                // Attach user info to request for route handlers
                req.user = user;
                next();
            } catch (error) {
                if (error.message === 'User not found') {
                    return res.status(401).json({ message: 'User not found' });
                }
                if (error.message === 'Email not verified') {
                    return res.status(403).json({ message: 'Email not verified' });
                }
                console.error("Error fetching user data:", error);
                return res.status(500).json({ message: 'Failed to verify user' });
            }
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
            try {
                const user = await getUserInfo(req.userId);

                if (user.subscription !== 'buyer') {
                    return res.status(403).json({ 
                        message: "Only buyers can access this resource" 
                    });
                }

                // Attach user info to request for route handlers
                req.user = user;
                next();
            } catch (error) {
                if (error.message === 'User not found') {
                    return res.status(401).json({ message: 'User not found' });
                }
                if (error.message === 'Email not verified') {
                    return res.status(403).json({ message: 'Email not verified' });
                }
                console.error("Error fetching user data:", error);
                return res.status(500).json({ message: 'Failed to verify user' });
            }
        });
    } catch (error) {
        console.error("Buyer auth middleware error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = { auth, sellerAuth, buyerAuth };
