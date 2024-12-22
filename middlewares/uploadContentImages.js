// /middlewares/uploadContentImages.js
const parseFile = require("./parseFile");

const uploadContentImages = async (req, res, next) => {
  try {
    const ideaId = req.params.ideaId || "unknown-idea";
    // folder is "content-images", prefix is ideaId, maxFiles = 10
    const uploadedFiles = await parseFile(req, "content-images", ideaId, 10);
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = uploadContentImages;
