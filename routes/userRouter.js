// /routes/userRouter.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authProtecter = require("../middlewares/auth");
const { mongoose } = require("../db/connection");

const User = require("../db/userModel");
const Idea = require("../db/ideaModel"); // We'll query Idea directly for bought-ideas


// Import the middleware for profile image uploads
const uploadProfileImages = require("../middlewares/uploadProfileImages");

/* 
  1) REGISTER USER
  POST /users/register
*/

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, subscription } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if email or username is in use
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email is already in use." });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      username,
      email,
      passwordHash,
      subscription: subscription || "none",
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully.",
      userId: newUser._id,
      username: newUser.username,
      subscription: newUser.subscription,
    });
  } catch (error) {
    console.error("Error in register route:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  2) LOGIN USER
  POST /users/login
*/

router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password." });
      }
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
      }
  
      // Generate a JWT for this user
      const token = jwt.sign(
        { _id: user._id },          // the payload
        process.env.JWT_SECRET,     // your secret
        { expiresIn: "1h" }         // e.g., token expires in 1 hour
      );
  
      // Set an HTTP-only cookie with the token
      // 'httpOnly' helps prevent XSS attacks by disallowing JS access
      // 'secure' should be true in production (HTTPS), set sameSite as needed
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,           // set to true if using HTTPS in production
        sameSite: "lax",         // or 'strict' / 'none' depending on your setup
        maxAge: 60 * 60 * 1000,  // cookie expires in 1 hour
      });
  
      return res.status(200).json({
        message: "Login successful.",
        userId: user._id,
        username: user.username,
        subscription: user.subscription,
        // We don't need to return the token here since it's in a cookie
      });
    } catch (error) {
      console.error("Error in login route:", error);
      return res.status(500).json({ error: error.message });
    }
  });
  
/* 
  3) UPLOAD/UPDATE PROFILE IMAGE
  POST /users/:userId/profile-image
*/
router.post(
  "/:userId/profile-image",
  authProtecter,
  uploadProfileImages,
  async (req, res) => {
    try {
        console.log("All registered models:", mongoose.connection.models);

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
  }
);

/*
  4) GET PAGINATED POSTED IDEAS
  GET /users/:userId/posted-ideas
  - STILL USING .populate() with skip, limit, sort => createdAt desc
*/
router.get("/:userId/posted-ideas", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    // 1) Find the user, populate postedIdeas with partial fields
    const user = await User.findById(userId).populate({
      path: "postedIdeas",
      select: "title preview price thumbnailImage rating category isSold createdAt",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 }, // by creation date of the idea
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2) For correct pagination, get total posted ideas
    const actualCount = await User.aggregate([
      { $match: { _id: user._id } },
      { $project: { postedCount: { $size: "$postedIdeas" } } },
    ]);
    const totalPostedIdeas = actualCount?.[0]?.postedCount || 0;
    const totalPages = Math.ceil(totalPostedIdeas / limit);

    return res.status(200).json({
      message: "Posted ideas fetched successfully",
      pagination: {
        currentPage: page,
        totalPages,
        pageSize: limit,
        totalCount: totalPostedIdeas,
      },
      postedIdeas: user.postedIdeas, // the slice after skip/limit
    });
  } catch (error) {
    console.error("Error fetching posted ideas:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  5) GET PAGINATED & SORTED BOUGHT IDEAS
  GET /users/:userId/bought-ideas
  - SORT by boughtAt desc, using top-level query on Idea.
*/
router.get("/:userId/bought-ideas", authProtecter, async (req, res) => {
  try {
    const userId = req.params.userId;

    // 1) Find the user (to ensure valid user & get user.boughtIdeas)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2) We do a top-level query on Idea.
    //    Because user.boughtIdeas is an array of ObjectIds referencing ideas the user purchased.
    //    We'll sort by 'boughtAt' desc, skip, limit.
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    // Count how many ideas are in user.boughtIdeas
    const totalCount = await Idea.countDocuments({
      _id: { $in: user.boughtIdeas },
    });

    // Query those ideas, sorted by boughtAt descending
    const purchasedIdeas = await Idea.find({
      _id: { $in: user.boughtIdeas },
    })
      .select("title preview price thumbnailImage rating category isSold boughtAt")
      .sort({ boughtAt: -1 }) // newest purchased first
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
      boughtIdeas: purchasedIdeas,
    });
  } catch (error) {
    console.error("Error fetching bought ideas:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
