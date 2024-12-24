// /middlewares/uploadContentImages.js
const parseFile = require("./parseFile");
const Idea = require("../db/ideaModel");

/**
 * Middleware that:
 * 1) Loads the idea doc to confirm the user is the creator
 * 2) If authorized, calls parseFile to handle multiple file uploads
 * 3) If not authorized, returns 403
 */
const uploadContentImages = async (req, res, next) => {
  try {
    // For example, user might pass :ideaId in URL
    const ideaId = req.params.ideaId;
    if (!ideaId) {
      return res.status(400).json({ message: "Missing ideaId parameter." });
    }

    // 1) Load minimal fields from Idea
    const idea = await Idea.findById(ideaId).select("creator");
    if (!idea) {
      return res.status(404).json({ message: "Idea not found." });
    }

    // 2) Check if user is the creator
    if (idea.creator.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to upload content images for this idea." });
    }

    // 3) If authorized, parse up to 10 files
    const uploadedFiles = await parseFile(req, "content-images", ideaId, 10);
    req.uploadedFiles = uploadedFiles;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = uploadContentImages;
