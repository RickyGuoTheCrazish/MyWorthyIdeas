// /middlewares/uploadIdeaImages.js
const formidable = require("formidable").default;
const parseFile = require("./parseFile");
const Idea = require("../db/ideaModel");

/**
 * Middleware that handles both cover and content images for idea editing
 */
const uploadIdeaImages = async (req, res, next) => {
    try {
        const ideaId = req.params.ideaId;
        if (!ideaId) {
            return res.status(400).json({ message: "Missing ideaId parameter." });
        }

        // Load minimal fields from Idea
        const idea = await Idea.findById(ideaId).select("creator");
        if (!idea) {
            return res.status(404).json({ message: "Idea not found." });
        }

        // Check if user is the creator
        if (idea.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                message: "Not authorized to upload images for this idea." 
            });
        }

        // Parse the form data
        const form = formidable({
            maxFieldsSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 11, // 1 for thumbnail + 10 for content
            multiples: true,
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return next(err);
            }

            try {
                // Attach fields to req.body
                req.body = fields;

                // Handle thumbnail image
                if (files.thumbnailImage) {
                    const coverFiles = await parseFile(req, "cover-images", ideaId, 1);
                    req.coverImage = coverFiles[0];
                }

                // Handle content images
                if (files.contentImages) {
                    const contentFiles = await parseFile(req, "content-images", ideaId, 10);
                    req.contentImages = contentFiles;
                }

                next();
            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = uploadIdeaImages;
