// /middlewares/uploadCoverImages.js
const parseFile = require("./parseFile");

const uploadCoverImages = async (req, res, next) => {
  try {
    // IdeaId might come from req.params or req.body
    const ideaId = req.params.ideaId || "unknown-idea";
    // folder is "cover-images", prefix is ideaId, maxFiles = 1
    const uploadedFiles = await parseFile(req, "cover-images", ideaId, 1);
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = uploadCoverImages;
