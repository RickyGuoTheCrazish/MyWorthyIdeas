// /middlewares/uploadCoverImages.js
const parseFile = require("./parseFile");
const Idea = require("../db/ideaModel");

/**
 * Middleware that:
 * 1) Loads the idea doc to confirm the user is the creator
 * 2) If authorized, calls parseFile to handle file upload
 * 3) If not authorized, returns 403
 */
const uploadCoverImages = async (req, res, next) => {
  try {
    // 1) Determine which idea we’re dealing with
    const ideaId = req.params.ideaId;
    if (!ideaId) {
      return res.status(400).json({ message: "Missing ideaId parameter." });
    }

    // 2) Load the idea and check existence
    const idea = await Idea.findById(ideaId).select("creator");
    if (!idea) {
      return res.status(404).json({ message: "Idea not found." });
    }

    // 3) Compare the idea’s creator with the current user
    if (idea.creator.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to upload a cover for this idea." });
    }

    // 4) If authorized, proceed with file parsing
    //    maxFiles = 1, folderName = "cover-images", prefix = ideaId
    const uploadedFiles = await parseFile(req, "cover-images", ideaId, 1);

    // 5) Attach the uploaded file paths to req for the route handler
    req.uploadedFiles = uploadedFiles;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = uploadCoverImages;
