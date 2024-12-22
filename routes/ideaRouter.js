// /routes/ideaRouter.js

const express = require("express");
const router = express.Router();

// Import Mongoose models
const Idea = require("../db/ideaModel");

// Import specialized middlewares for uploading images
const uploadCoverImages = require("../middlewares/uploadCoverImages");
const uploadContentImages = require("../middlewares/uploadContentImages");

/**
 * STEP 1: Create a new Idea (basic info).
 * POST /ideas
 *
 * Body example:
 * {
 *   title: "Some Title",
 *   preview: "Short preview text",
 *   content: "Full text content",
 *   price: 123,
 *   creator: "userIdHere"
 * }
 */
router.post("/", async (req, res) => {
  try {
    const { title, preview, content, price, creator } = req.body;

    // Create Idea document
    const newIdea = new Idea({
      title,
      preview,
      content,
      price,
      creator,
      isSold: false,       // default
      thumbnailImage: "", // no cover yet
      contentImages: [],  // no content images yet
      rating: null,       // if you're using the rating field
    });

    await newIdea.save();

    return res.status(201).json({
      message: "New idea created successfully",
      idea: newIdea,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * STEP 2a: Upload/Update the "Cover Image" for an Idea.
 * POST /ideas/:ideaId/cover
 *
 * Uses the 'uploadCoverImages' middleware to handle uploading a single image to S3,
 * then we update 'thumbnailImage' in the Idea document.
 */
router.post("/:ideaId/cover", uploadCoverImages, async (req, res) => {
  try {
    const [coverImageUrl] = req.uploadedFiles || [];
    if (!coverImageUrl) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const ideaId = req.params.ideaId;
    // Update the Idea's thumbnailImage with the new S3 URL
    const updatedIdea = await Idea.findByIdAndUpdate(
      ideaId,
      { thumbnailImage: coverImageUrl },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    return res.status(200).json({
      message: "Cover image uploaded and updated successfully",
      idea: updatedIdea,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * STEP 2b: Upload/Update "Content Images" for an Idea.
 * POST /ideas/:ideaId/content-images
 *
 * Uses the 'uploadContentImages' middleware to handle uploading multiple files (up to 10) to S3,
 * then we push those S3 URLs into 'contentImages' array in the Idea document.
 */
router.post("/:ideaId/content-images", uploadContentImages, async (req, res) => {
  try {
    const contentImageUrls = req.uploadedFiles || [];
    if (!contentImageUrls.length) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    const ideaId = req.params.ideaId;
    const updatedIdea = await Idea.findByIdAndUpdate(
      ideaId,
      { $push: { contentImages: { $each: contentImageUrls } } },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    return res.status(200).json({
      message: "Content images uploaded and updated successfully",
      idea: updatedIdea,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * OPTIONAL: Update the textual 'content' of an Idea.
 * PUT /ideas/:ideaId/content
 *
 * The body can include the new or updated content string,
 * which may reference the newly uploaded images by index or placeholders.
 */
router.put("/:ideaId/content", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const ideaId = req.params.ideaId;
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    idea.content = content;
    await idea.save();

    return res.status(200).json({
      message: "Idea content updated",
      idea,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * OPTIONAL: Update other fields (title, preview, price, etc.) in one route.
 * PUT /ideas/:ideaId
 */
router.put("/:ideaId", async (req, res) => {
  try {
    const updates = req.body; // e.g. { title, preview, price, isSold, etc. }

    const idea = await Idea.findByIdAndUpdate(req.params.ideaId, updates, {
      new: true,
    });

    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    return res.status(200).json({
      message: "Idea updated successfully",
      idea,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
