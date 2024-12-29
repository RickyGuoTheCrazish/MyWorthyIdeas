// /middlewares/uploadProfileImages.js
const parseFile = require("./parseFile");
const User = require("../db/userModel");

/**
 * Middleware that:
 * 1) Loads the user doc to confirm the requester is the same user
 * 2) If authorized, calls parseFile to handle file upload
 * 3) If not authorized, returns 403
 */
const uploadProfileImages = async (req, res, next) => {
  try {
    // We assume the route uses :userId param, e.g. POST /users/:userId/profile-image
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId parameter." });
    }

    // 1) Load the user to check existence
    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2) Compare the user’s _id with the current logged-in user
    if (user._id.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to upload a profile image for this user." });
    }

    // 3) If authorized, call parseFile to handle the file upload
    //    We'll store images under "profile-images/<userId>" folder, maxFiles = 1
    const uploadedFiles = await parseFile(req, "profile-images", userId, 1);

    // 4) Attach the uploaded file paths to req for the route handler
    req.uploadedFiles = uploadedFiles;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = uploadProfileImages;
