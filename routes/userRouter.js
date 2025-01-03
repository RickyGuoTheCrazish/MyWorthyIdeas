// /routes/userRouter.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // for generating random token
const { authLimiter } = require("../middlewares/rateLimiter");

// We'll define the time constants here
const TEN_MINUTES = 10 * 60 * 1000;  // 10 minutes in ms
const ONE_MINUTE = 60 * 1000;       // 1 minute in ms

const authProtecter = require("../middlewares/auth");
const { mongoose } = require("../db/connection");
const { sendMail } = require("../services/emailService");

const User = require("../db/userModel");
const Idea = require("../db/ideaModel");
const uploadProfileImages = require("../middlewares/uploadProfileImages");

/** 
 * Example username validator:
 * - >=6 chars
 * - Letters, digits, underscore(_), dash(-), optional spaces
 */
function validateUsername(username) {
  if (!username || username.length < 6) return false;
  const usernameRegex = /^[A-Za-z0-9_\- ]+$/;
  return usernameRegex.test(username);
}

/** 
 * Example password validator:
 * - >=6 chars
 * - Contains at least one letter
 * - Contains at least one digit/underscore/dash (you can expand to other symbols)
 */
function validatePassword(password) {
  if (!password || password.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigitOrSymbol = /[\d_\-]/.test(password);
  return hasLetter && hasDigitOrSymbol;
}

/* 
  1) REGISTER USER (Email Verification)
  POST /users/register
*/
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password, subscription } = req.body;
    if (!username || !email || !password || !subscription) {
      return res.status(422).json({ 
        message: "Missing required fields.",
        errorType: "MISSING_FIELDS",
        field: !username ? "username" : !email ? "email" : !password ? "password" : "subscription"
      });
    }

    // Validate subscription type
    if (!['buyer', 'seller'].includes(subscription)) {
      return res.status(422).json({ 
        message: "Invalid subscription type. Must be either 'buyer' or 'seller'.",
        errorType: "INVALID_SUBSCRIPTION",
        field: "subscription"
      });
    }

    // Validate username & password
    if (!validateUsername(username)) {
      return res.status(422).json({
        message: "Invalid username. Must be >=6 chars, letters/digits/_- plus optional space.",
        errorType: "INVALID_USERNAME",
        field: "username"
      });
    }
    if (!validatePassword(password)) {
      return res.status(422).json({
        message: "Invalid password. Min 6 chars, must include letter + digit/symbol.",
        errorType: "INVALID_PASSWORD",
        field: "password"
      });
    }

    // Check uniqueness - check username and email separately for better error messages
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ 
        message: "This username is already in use. Please choose a different username.",
        errorType: "USERNAME_EXISTS",
        field: "username"
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ 
        message: "This email is already registered. Please use a different email or try logging in.",
        errorType: "EMAIL_EXISTS",
        field: "email"
      });
    }

    // Hash password
    let passwordHash;
    try {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
      console.error("Password hashing error:", hashError);
      return res.status(500).json({ 
        message: "Error processing password. Please try again.",
        errorType: "PASSWORD_HASH_ERROR"
      });
    }

    // Generate verification token & set expiration
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const now = new Date();
    const verificationTokenExp = new Date(now.getTime() + TEN_MINUTES);

    // Create user doc
    const newUserDoc = new User({
      username,
      email,
      passwordHash,
      subscription,
      isVerified: false,
      verificationToken,
      verificationTokenExp,
      lastVerificationSentAt: now
    });

    // Save user
    try {
      await newUserDoc.save();
    } catch (saveError) {
      console.error("User save error:", saveError);
      if (saveError.code === 11000) {
        return res.status(409).json({ 
          message: "This username or email is already in use.",
          errorType: "DUPLICATE_KEY_ERROR",
          field: Object.keys(saveError.keyPattern)[0]
        });
      }
      return res.status(503).json({ 
        message: "Error creating user account. Please try again.",
        errorType: "USER_SAVE_ERROR"
      });
    }

    // Send verification email
    try {
      const verifyUrl = `http://localhost:6001/api/users/verify-email?token=${verificationToken}`;
      await sendMail(
        email,
        "Verify Your Email",
        `Hello ${username},\n\nPlease verify your email within 10 minutes by clicking:\n${verifyUrl}\n\nBest,\nTeam`
      );
    } catch (mailError) {
      console.error("Error sending verification email:", mailError);
      // Delete the user if email fails
      try {
        await User.findByIdAndDelete(newUserDoc._id);
      } catch (deleteError) {
        console.error("Error deleting user after email failure:", deleteError);
      }
      return res.status(502).json({
        message: "Failed to send verification email. Please try again.",
        errorType: "EMAIL_SEND_ERROR"
      });
    }

    return res.status(201).json({
      message: "Verification email sent. Please check your inbox.",
      userId: newUserDoc._id,
    });
  } catch (error) {
    console.error("Error in register route:", error);
    return res.status(500).json({ 
      message: "An unexpected error occurred. Please try again.",
      errorType: "SERVER_ERROR",
      error: error.message 
    });
  }
});

/*
  2) VERIFY EMAIL
  GET /users/verify-email?token=xxx
*/
router.get("/verify-email", authLimiter, async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Missing token." });
    }

    // Find user by token
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or unknown token." });
    }

    // Check if token expired
    const now = new Date();
    if (!user.verificationTokenExp || now > user.verificationTokenExp) {
      return res.status(400).json({
        message: "Verification token expired. Please request a new one.",
      });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationToken = "";
    user.verificationTokenExp = null;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  3) RESEND VERIFICATION (60s COOLDOWN)
  POST /users/resend-verification
*/
router.post("/resend-verification", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Missing email." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified. No need to resend."
      });
    }

    // check 60-second cooldown
    const now = new Date();
    if (
      user.lastVerificationSentAt &&
      now - user.lastVerificationSentAt < ONE_MINUTE
    ) {
      return res.status(429).json({
        message: "Please wait 60 seconds before requesting another email.",
      });
    }

    // generate new token + 10-min expiration
    const newToken = crypto.randomBytes(20).toString("hex");
    const newExp = new Date(now.getTime() + TEN_MINUTES);

    user.verificationToken = newToken;
    user.verificationTokenExp = newExp;
    user.lastVerificationSentAt = now;
    await user.save();

    const verifyUrl = `http://localhost:6001/api/users/verify-email?token=${newToken}`;
    try {
      await sendMail(
        user.email,
        "Resend: Verify Your Email",
        `Hello ${user.username},\n\nPlease verify your email within 10 minutes:\n${verifyUrl}\n\nBest,\nTeam`
      );
    } catch (mailErr) {
      console.error("Error sending verification email:", mailErr);
      return res.status(500).json({
        message: "Failed to send verification email. Please retry.",
      });
    }

    return res.status(200).json({
      message: "Verification email resent successfully.",
    });
  } catch (error) {
    console.error("Error in resend-verification route:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  4) LOGIN USER (Block if not isVerified)
  POST /users/login
*/
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // block if not verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify before logging in."
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful.",
      userId: user._id,
      username: user.username,
      subscription: user.subscription,
      credits: user.credits,
      earnings: user.earnings,
      token
    });
  } catch (error) {
    console.error("Error in login route:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  4.5) LOGOUT USER
  POST /users/logout
*/
router.post("/logout", async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax"
    });

    return res.status(200).json({
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Error in logout route:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  5) UPLOAD/UPDATE PROFILE IMAGE
  POST /users/:userId/profile-image
*/
router.post("/:userId/profile-image", authProtecter, uploadProfileImages, async (req, res) => {
  try {
    const [profileImageUrl] = req.uploadedFiles || [];
    if (!profileImageUrl) {
      return res.status(400).json({ message: "No profile image uploaded." });
    }

    const userId = req.params.userId;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: profileImageUrl },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile image uploaded successfully.",
      profileImageUrl,
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        profileImage: updatedUser.profileImage,
      },
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  6) GET PAGINATED POSTED IDEAS (UNSOLD)
  GET /users/:userId/posted-ideas
*/
router.get("/:userId/posted-ideas", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: "postedIdeas",
      match: { isSold: false },  // Only get unsold ideas
      select: "title preview price thumbnailImage rating categories isSold createdAt",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const actualCount = await User.aggregate([
      { $match: { _id: user._id } },
      { $project: { postedCount: { $size: "$postedIdeas" } } },
    ]);
    const totalPostedIdeas = actualCount?.[0]?.postedCount || 0;
    const totalPages = Math.ceil(totalPostedIdeas / limit);

    // Add seller information to each idea
    const ideasWithSeller = user.postedIdeas.map(idea => ({
      ...idea.toObject(),
      seller: {
        _id: user._id,
        username: user.username,
        averageRating: user.averageRating || 0
      }
    }));

    return res.status(200).json({
      message: "Posted ideas fetched successfully",
      pagination: {
        currentPage: page,
        totalPages,
        pageSize: limit,
        totalItems: totalPostedIdeas,
      },
      ideas: ideasWithSeller,
    });
  } catch (error) {
    console.error("Error fetching posted ideas:", error);
    return res.status(500).json({ message: "Error fetching posted ideas." });
  }
});

/*
  7) GET PAGINATED & SORTED BOUGHT IDEAS
  GET /users/:userId/bought-ideas
*/
router.get("/:userId/bought-ideas", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    const totalCount = await Idea.countDocuments({ _id: { $in: user.boughtIdeas } });

    const purchasedIdeas = await Idea.find({ _id: { $in: user.boughtIdeas } })
      .select("title preview price thumbnailImage rating categories isSold boughtAt creator")
      .populate({
        path: 'creator',
        select: 'username averageRating'
      })
      .sort({ boughtAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      message: "Bought ideas fetched successfully (by boughtAt desc)",
      pagination: {
        currentPage: page,
        totalPages,
        pageSize: limit,
        totalCount,
      },
      boughtIdeas: purchasedIdeas.map(idea => ({
        ...idea.toObject(),
        seller: {
          _id: idea.creator._id,
          username: idea.creator.username,
          averageRating: idea.creator.averageRating || 0
        }
      })),
    });
  } catch (error) {
    console.error("Error fetching bought ideas:", error);
    return res.status(500).json({ message: "Error fetching bought ideas" });
  }
});

/*
  8) GET PAGINATED SOLD IDEAS
  GET /users/:userId/sold-ideas
*/
router.get("/:userId/sold-ideas", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: "postedIdeas",
      match: { isSold: true },  // Only get sold ideas
      select: "title preview price thumbnailImage rating categories isSold createdAt",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const actualCount = await User.aggregate([
      { $match: { _id: user._id } },
      { $project: { soldCount: { 
        $size: { 
          $filter: { 
            input: "$postedIdeas",
            as: "idea",
            cond: { $eq: ["$$idea.isSold", true] }
          }
        }
      } } },
    ]);
    const totalSoldIdeas = actualCount?.[0]?.soldCount || 0;
    const totalPages = Math.ceil(totalSoldIdeas / limit);

    // Add seller information to each idea
    const ideasWithSeller = user.postedIdeas.map(idea => ({
      ...idea.toObject(),
      seller: {
        _id: user._id,
        username: user.username,
        averageRating: user.averageRating || 0
      }
    }));

    return res.status(200).json({
      message: "Sold ideas fetched successfully",
      pagination: {
        currentPage: page,
        totalPages,
        pageSize: limit,
        totalItems: totalSoldIdeas,
      },
      ideas: ideasWithSeller,
    });
  } catch (error) {
    console.error("Error fetching sold ideas:", error);
    return res.status(500).json({ message: "Error fetching sold ideas." });
  }
});

/*
  9) CHANGE PASSWORD
  PUT /users/:userId/change-password
*/
router.put("/:userId/change-password", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "Missing newPassword field." });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be >=6 chars, contain letter + digit/symbol.",
      });
    }

    // Must be same user
    if (userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to change this user's password.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Attempt sending "Password Changed" email BEFORE saving
    try {
      await sendMail(
        user.email,
        "Password Changed Successfully",
        `Hello ${user.username},\n\nYour account password was just updated.\nIf you did not perform this action, please contact support.\n\nBest,\nTeam`
      );
    } catch (mailErr) {
      console.error("Error sending password-change email:", mailErr);
      return res.status(500).json({
        message: "Failed to send 'password changed' email. Please retry.",
      });
    }

    user.passwordHash = newPasswordHash;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error in change-password route:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get user's sold ideas
router.get('/:userId/sold-ideas', authProtecter, async (req, res) => {
    try {
        const userId = req.params.userId;
      
        // Verify user is requesting their own data
        if (req.user._id !== userId) {
            return res.status(403).json({ message: 'Unauthorized access to user data' });
        }

        const ideas = await Idea.find({
            creator: userId,
            isSold: true
        }).select('title description price rating createdAt updatedAt isSold thumbnailImage');

        const user = await User.findById(userId).select('username');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            ideas: ideas.map(idea => ({
                ...idea.toObject(),
                sellerName: user.username
            }))
        });
    } catch (error) {
        console.error('Error fetching sold ideas:', error);
        res.status(500).json({ message: 'Error fetching sold ideas' });
    }
});

/*
  GET CURRENT USER
  GET /users/me
*/
router.get("/me", authProtecter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      userId: user._id,
      username: user.username,
      subscription: user.subscription,
      credits: user.credits,
      earnings: user.earnings,
      profileImage: user.profileImage,
      averageRating: user.averageRating
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get user's financial data
router.get('/financial-data', authProtecter, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits earnings subscription');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      credits: user.credits,
      earnings: user.earnings,
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ message: 'Error fetching financial data' });
  }
});

module.exports = router;
