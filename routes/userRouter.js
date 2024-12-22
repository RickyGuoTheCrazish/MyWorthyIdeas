// /routes/userRouter.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const authProtecter = require("../middlewares/auth");

// Import the User model
const User = require("../db/userModel");

// Import the middleware for profile image uploads
const uploadProfileImages = require("../middlewares/uploadProfileImages");

/* 
  1) REGISTER USER
  POST /users/register
  Expects: { username, email, password, subscription }
*/
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, subscription } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if email or username is already used
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email is already in use." });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create the new user
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
  2) LOGIN USER (Optional)
  POST /users/login
  Expects: { email, password }
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

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // If you want to create a session or JWT, you can do it here
    // For now, we just return a success message
    return res.status(200).json({
      message: "Login successful.",
      userId: user._id,
      username: user.username,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Error in login route:", error);
    return res.status(500).json({ error: error.message });
  }
});

/* 
  3) UPLOAD/UPDATE PROFILE IMAGE
  POST /users/:userId/profile-image
  Form-data (multipart) with 1 file
*/
router.post("/:userId/profile-image", authProtecter, uploadProfileImages, async (req, res) => {
  try {
    const [profileImageUrl] = req.uploadedFiles || [];

    if (!profileImageUrl) {
      return res.status(400).json({ message: "No profile image uploaded." });
    }

    // Update the user's profileImage field
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
  4) OPTIONAL: Add an idea to the user's postedIdeas
  POST /users/:userId/posted-ideas
  Expects: { ideaId }
*/
router.post("/:userId/posted-ideas",authProtecter, async (req, res) => {
  try {
    const { ideaId } = req.body;
    const userId = req.params.userId;

    if (!ideaId) {
      return res.status(400).json({ message: "Missing ideaId." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Add the idea to user's postedIdeas
    user.postedIdeas.push(ideaId);
    await user.save();

    return res.status(200).json({
      message: "Idea added to postedIdeas.",
      postedIdeas: user.postedIdeas,
    });
  } catch (error) {
    console.error("Error adding posted idea:", error);
    return res.status(500).json({ error: error.message });
  }
});

/*
  5) OPTIONAL: Add a purchased idea to the user's boughtIdeas
  POST /users/:userId/bought-ideas
  Expects: { ideaId, rating? }
*/
router.post("/:userId/bought-ideas", authProtecter, async (req, res) => {
  try {
    const { ideaId, rating } = req.body;
    const userId = req.params.userId;

    if (!ideaId) {
      return res.status(400).json({ message: "Missing ideaId." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Add the idea to user's boughtIdeas
    user.boughtIdeas.push({
      idea: ideaId,
      rating: rating || null,
    });
    await user.save();

    return res.status(200).json({
      message: "Idea added to boughtIdeas.",
      boughtIdeas: user.boughtIdeas,
    });
  } catch (error) {
    console.error("Error adding bought idea:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
