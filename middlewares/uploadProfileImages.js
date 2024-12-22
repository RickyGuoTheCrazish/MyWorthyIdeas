// /middlewares/uploadProfileImages.js
const parseFile = require("./parseFile");

const uploadProfileImages = async (req, res, next) => {
  try {
    // For example, userId could come from req.user._id
    const userId = req.user?._id?.toString() || "unknown-user";
    // folder is "profile-images", prefix is userId, maxFiles = 1
    const uploadedFiles = await parseFile(req, "profile-images", userId, 1);
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = uploadProfileImages;
