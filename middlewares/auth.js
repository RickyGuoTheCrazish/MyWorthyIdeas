// /middlewares/auth.js
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    // 1) Try to read from 'token' cookie first
    const tokenFromCookie = req.cookies?.token;
    
    // 2) Fallback to Authorization header
    const tokenFromHeader = req.headers.authorization?.split(' ')[1];
    
    // Use cookie token if available, otherwise use header token
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ message: "No auth token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Invalid token" });
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
