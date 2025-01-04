const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Idea = require("../db/ideaModel");
const User = require("../db/userModel");
const authProtecter = require("../middlewares/auth");
const optionalAuth = require("../middlewares/optionalAuth");
const { mongoose } = require("../db/connection");
const { ideaCreationLimiter, ideaPurchaseLimiter } = require("../middlewares/rateLimiter");
const uploadIdeaImages = require("../middlewares/uploadIdeaImages");

// Middlewares for uploading images
const uploadCoverImages = require("../middlewares/uploadCoverImages");
const uploadContentImages = require("../middlewares/uploadContentImages");

// GET ideas by category (must be before :ideaId routes)
router.get("/by-category", async (req, res) => {
  try {
    let { category, subcategory, page = 1, limit = 12, sortBy = 'newest' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Build category filter
    const categoryFilter = { isSold: false };
    if (category) {
      if (subcategory) {
        // If both category and subcategory are provided
        categoryFilter.$and = [
          { 'categories.main': new RegExp(`^${category}$`, 'i') },
          { 'categories.sub': new RegExp(`^${subcategory}$`, 'i') }
        ];
      } else {
        // If only main category is provided
        categoryFilter['categories.main'] = new RegExp(`^${category}$`, 'i');
      }
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get total count for pagination
    const totalCount = await Idea.countDocuments(categoryFilter);

    // Fetch ideas
    const ideas = await Idea.find(categoryFilter)
      .select("title preview price thumbnailImage rating categories creator createdAt")
      .populate({
        path: 'creator',
        select: 'username averageRating'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    if (!ideas || ideas.length === 0) {
      return res.status(404).json({ 
        message: "No ideas found",
        debug: {
          filter: categoryFilter,
          totalCount,
          skip,
          limit
        }
      });
    }

    // Transform ideas to include seller info
    const transformedIdeas = ideas.map(idea => ({
      ...idea.toObject(),
      seller: {
        _id: idea.creator._id,
        username: idea.creator.username,
        averageRating: idea.creator.averageRating || 0
      }
    }));

    const response = {
      message: "Ideas fetched successfully",
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        pageSize: limit,
        totalItems: totalCount,
      },
      ideas: transformedIdeas,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ 
      message: "Error fetching ideas",
      error: error.message
    });
  }
});

// Search ideas by title or ID (must be before :ideaId routes)
router.get("/search", optionalAuth, async (req, res) => {
  try {
    const { type = 'title', query = '' } = req.query;
    
    if (!query.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (type === 'id') {
      // Clean up the ID by removing # and whitespace, and take last 6 characters
      const cleanId = query.replace('#', '').trim().toUpperCase().slice(-6);
      
      // Use aggregation pipeline to match the last 6 characters of the _id
      const ideas = await Idea.aggregate([
        {
          $addFields: {
            shortId: {
              $toUpper: {
                $substr: [
                  { $toString: "$_id" },
                  { $subtract: [{ $strLenCP: { $toString: "$_id" } }, 6] },
                  6
                ]
              }
            }
          }
        },
        {
          $match: {
            shortId: cleanId,
            isSold: { $ne: true }
          }
        },
        {
          $limit: 20
        }
      ]);

      // Populate creator information
      await Idea.populate(ideas, { path: 'creator', select: 'username averageRating' });

      // Map ideas to include only necessary fields
      const sanitizedIdeas = ideas.map(idea => ({
        _id: idea._id,
        title: idea.title,
        price: idea.price,
        thumbnailImage: idea.thumbnailImage,
        creator: {
          username: idea.creator?.username,
          averageRating: idea.creator?.averageRating
        },
        categories: idea.categories,
        isSold: idea.isSold
      }));

      return res.json({ ideas: sanitizedIdeas });
    } else {
      // If searching by title, use case-insensitive partial match
      const searchQuery = {
        title: new RegExp(query.trim(), 'i'),
        isSold: { $ne: true }
      };

      const ideas = await Idea.find(searchQuery)
        .populate('creator', 'username averageRating')
        .limit(20);

      // Map ideas to include only necessary fields
      const sanitizedIdeas = ideas.map(idea => ({
        _id: idea._id,
        title: idea.title,
        price: idea.price,
        thumbnailImage: idea.thumbnailImage,
        creator: {
          username: idea.creator?.username,
          averageRating: idea.creator?.averageRating
        },
        categories: idea.categories,
        isSold: idea.isSold
      }));

      return res.json({ ideas: sanitizedIdeas });
    }
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      message: "Error searching ideas",
      error: error.message
    });
  }
});

/**
 * CREATE A NEW IDEA (basic info).
 * POST /ideas/create
 */
router.post("/create", authProtecter, ideaCreationLimiter, async (req, res) => {
  try {
    const { title, preview, price, categories } = req.body;
    // 'categories' is expected to be an array of objects like:
    // [{
    //   main: "Technology",
    //   sub: "Computer"
    // }]
    const creator = req.user._id; // from authProtecter (the logged-in user)

    const newIdea = new Idea({
      title,
      preview,
      price,
      creator,

      isSold: false,
      thumbnailImage: "",
      contentImages: [],
      rating: null,
      buyer: null,
      boughtAt: null,
      contentRaw: {},
      contentHtml: "",
      categories: categories || []
    });

    await newIdea.save();

    // Also update the User's postedIdeas
    const user = await User.findById(creator);
    if (!user) {
      return res.status(404).json({
        message: "Creator not found. Idea created but user does not exist.",
      });
    }
    user.postedIdeas.push(newIdea._id);
    await user.save();

    return res.status(201).json({
      message: "New idea created successfully",
      idea: {
        _id: newIdea._id,
        title: newIdea.title,
        preview: newIdea.preview,
        price: newIdea.price,
        categories: newIdea.categories, // [{ main, sub }]
        isSold: newIdea.isSold,
      },
    });
  } catch (error) {
    // If it's a validation error from the sub/main mismatch, respond 400
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

/**
 * BUY AN IDEA (one-time sale)
 * POST /ideas/:ideaId/buy
 */
router.post("/:ideaId/buy", authProtecter, ideaPurchaseLimiter, async (req, res) => {
  try {
    const ideaId = req.params.ideaId;
    const idea = await Idea.findById(ideaId).select("price isSold buyer creator");
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    if (idea.isSold) {
      return res.status(400).json({ message: "Idea is already sold." });
    }

    // 1) Check the buyer is actually allowed to buy (subscription + credits)
    const buyerId = req.user._id;
    const buyerUser = await User.findById(buyerId).select(
      "subscription credits boughtIdeas"
    );
    if (!buyerUser) {
      return res.status(404).json({ message: "Buyer user not found." });
    }

    // subscription must be "buyer" or "premium"
    if (buyerUser.subscription !== "buyer" && buyerUser.subscription !== "premium") {
      return res.status(403).json({ message: "User is not a buyer or premium subscriber" });
    }

    // Check buyer’s credits
    if (buyerUser.credits < idea.price) {
      return res.status(400).json({
        message: `Insufficient credits. Price: ${idea.price}, your credits: ${buyerUser.credits}`,
      });
    }

    // 2) Mark idea as sold
    idea.isSold = true;
    idea.buyer = buyerUser._id;
    idea.boughtAt = new Date();

    // 3) Deduct buyer's credits
    buyerUser.credits -= idea.price;

    // 4) Increase seller's earnings
    const sellerUser = await User.findById(idea.creator).select("earnings");
    if (!sellerUser) {
      return res.status(404).json({ message: "Seller not found." });
    }
    sellerUser.earnings += idea.price;

    // 5) Save the updated idea and users
    await idea.save();
    buyerUser.boughtIdeas.push(idea._id);
    await buyerUser.save();
    await sellerUser.save();

    return res.status(200).json({
      message: "Idea purchased successfully",
      idea: {
        _id: idea._id,
        isSold: idea.isSold,
        buyer: idea.buyer,
        boughtAt: idea.boughtAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET A SPECIFIC IDEA (with restricted content).
 * GET /ideas/:ideaId
 * Public endpoint - returns basic info for everyone, full content for creator/buyer
 */
router.get("/:ideaId", optionalAuth, async (req, res) => {
  try {
    const ideaId = req.params.ideaId;
    
    // Populate the creator => postedIdeas => rating, also the buyer if needed
    const idea = await Idea.findById(ideaId)
      .populate({
        path: "creator",
        populate: {
          path: "postedIdeas",
          select: "rating",
        },
      })
      .populate("buyer");

    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    // Helper to sanitize user fields
    const sanitizeUser = (userDoc) => {
      if (!userDoc) return null;
      return {
        _id: userDoc._id,
        username: userDoc.username,
        averageRating: userDoc.averageRating || 0,
      };
    };

    // Build base response with public information
    const baseIdea = {
      _id: idea._id,
      title: idea.title,
      preview: idea.preview,
      price: idea.price,
      creator: sanitizeUser(idea.creator),
      isSold: idea.isSold,
      thumbnailImage: idea.thumbnailImage,
      categories: idea.categories,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      buyer: idea.buyer,
      rating: idea.rating || null,
      ratedAt: idea.ratedAt || null
    };

    // If user is authenticated, check if they're the creator or buyer
    if (req.user) {
      const requestingUserId = req.user.userId;
      const creatorId = idea.creator?._id?.toString();
      const buyerId = idea.buyer?._id?.toString();
      
      // If user is the creator or buyer => can see contentRaw/contentHtml
      const isOwnerOrBuyer = requestingUserId === creatorId || requestingUserId === buyerId;

      if (isOwnerOrBuyer) {
        baseIdea.contentRaw = idea.contentRaw;
        baseIdea.contentHtml = idea.contentHtml;
        baseIdea.contentImages = idea.contentImages;
        if (idea.buyer) {
          baseIdea.buyer = sanitizeUser(idea.buyer);
          baseIdea.boughtAt = idea.boughtAt;
        }
      }
    }

    return res.status(200).json({
      message: "Idea fetched successfully",
      idea: baseIdea,
    });
  } catch (error) {
    console.error('Error fetching idea:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET A PAGINATED LIST OF IDEAS (partial info), BUT ONLY UNSOLD ONES
 * GET /ideas
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type || 'all';
    const skip = (page - 1) * limit;

    // Base query
    let query = { isSold: false };

    // Add type-specific filters
    if (type === 'recommendations') {
      // For recommendations:
      // 1. If user is logged in, exclude their ideas
      // 2. Sort by rating and recency
      query = {
        ...query,
        ...(req.user && { creator: { $ne: req.user._id } })  // Exclude user's ideas if logged in
      };
    }

    // Get total count for pagination
    const total = await Idea.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get ideas with pagination and sorting
    let ideas = await Idea.find(query)
      .sort({ 
        rating: -1,        // Higher rated first
        createdAt: -1      // Then newer ones
      })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username email')
      .lean();

    // Process ideas
    ideas = ideas.map(idea => ({
      _id: idea._id,
      title: idea.title,
      preview: idea.preview,
      price: idea.price,
      rating: idea.rating || 0,
      thumbnailImage: idea.thumbnailImage,
      categories: idea.categories,
      seller: {
        _id: idea.creator._id,
        username: idea.creator.username
      },
      createdAt: idea.createdAt
    }));

    res.json({
      ideas,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ message: "Error fetching ideas", error: error.message });
  }
});

/**
 * POST /ideas/:ideaId/cover
 * after the middleware passes, we know the user is the creator
 */
router.post("/:ideaId/cover", authProtecter, uploadCoverImages, async (req, res) => {
  try {
    // 1) We already verified ownership in the middleware
    // 2) We have the uploaded file in req.uploadedFiles
    const [coverImageUrl] = req.uploadedFiles || [];
    if (!coverImageUrl) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    // 3) Now do the actual DB update
    const ideaId = req.params.ideaId;
    const idea = await Idea.findById(ideaId).select("thumbnailImage");
    // Because the middleware ensures existence & ownership, 
    // If idea doesn't exist, that's abnormal—check anyway to be safe
    if (!idea) {
      return res.status(404).json({ message: "Idea not found after upload." });
    }

    idea.thumbnailImage = coverImageUrl;
    await idea.save();

    return res.status(200).json({
      message: "Cover image uploaded and updated successfully",
      idea: {
        _id: idea._id,
        thumbnailImage: idea.thumbnailImage,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ideas/:ideaId/content-images
 * Upload content images for an idea. Only the creator can do this.
 */
router.post("/:ideaId/content-images", authProtecter, uploadContentImages, async (req, res) => {
    try {
        // 1) Find the idea and check if it exists
        const idea = await Idea.findById(req.params.ideaId);
        if (!idea) {
            return res.status(404).json({ message: "Idea not found" });
        }

        // 2) Check if the logged-in user is the creator
        if (idea.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only upload images to your own ideas" });
        }

        // 3) Add the uploaded image URLs to the idea's contentImages
        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            idea.contentImages = [...idea.contentImages, ...req.uploadedFiles];
            await idea.save();
        } else {
            return res.status(400).json({ message: "No files were uploaded" });
        }

        // 4) Return the updated idea with contentImages
        return res.status(200).json({
            message: "Content images uploaded successfully",
            idea: {
                _id: idea._id,
                contentImages: idea.contentImages
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            message: "Failed to upload content images",
            error: error.message 
        });
    }
});

/**
 * DELETE /ideas/:ideaId/content-images
 * Remove a single image URL from contentImages.
 * Only the creator can do this.
 */
router.delete("/:ideaId/content-images", authProtecter, async (req, res) => {
  try {
    const { imageToRemove } = req.body;
    if (!imageToRemove) {
      return res.status(400).json({
        message: "Must provide 'imageToRemove' in request body."
      });
    }

    // 1) Load only needed fields
    const idea = await Idea.findById(req.params.ideaId)
      .select("creator contentImages");
    if (!idea) {
      return res.status(404).json({ message: "Idea not found." });
    }

    // 2) Check ownership
    if (idea.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to modify this idea's images."
      });
    }

    // 3) Remove the image
    const originalLen = idea.contentImages.length;
    idea.contentImages = idea.contentImages.filter(
      (url) => url !== imageToRemove
    );

    if (idea.contentImages.length === originalLen) {
      return res.status(400).json({
        message: "Image URL not found in contentImages array."
      });
    }

    await idea.save();

    // 4) Return minimal data
    return res.status(200).json({
      message: "Image removed from contentImages successfully",
      idea: {
        _id: idea._id,
        contentImages: idea.contentImages,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /ideas/:ideaId/content
 * Update textual content (both raw and HTML). Only the idea's creator can do this.
 */
router.put("/:ideaId/content", authProtecter, async (req, res) => {
  try {
    const { contentRaw, contentHtml } = req.body;
    if (!contentRaw && !contentHtml) {
      return res
        .status(400)
        .json({ message: "Must provide contentRaw or contentHtml to update" });
    }

    // Parse contentRaw if it's a string
    let parsedContentRaw = contentRaw;
    if (typeof contentRaw === 'string') {
      try {
        parsedContentRaw = JSON.parse(contentRaw);
      } catch (e) {
        return res.status(400).json({ message: "Invalid contentRaw format" });
      }
    }

    // 1) load doc with only creator + contentRaw + contentHtml
    const idea = await Idea.findById(req.params.ideaId).select(
      "creator contentRaw contentHtml"
    );
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    // 2) check ownership
    if (idea.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this idea" });
    }

    // 3) update
    if (parsedContentRaw) idea.contentRaw = parsedContentRaw;
    if (contentHtml) idea.contentHtml = contentHtml;

    await idea.save();

    return res.status(200).json({
      message: "Idea content updated",
      idea: {
        _id: idea._id,
        contentRaw: idea.contentRaw,
        contentHtml: idea.contentHtml,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /ideas/:ideaId
 * Update limited fields: title, preview, price, categories
 * Reject requests with disallowed fields.
 * Only the idea's creator can do this.
 * Minimally load data & limit creator fields.
 */
router.put("/:ideaId", authProtecter, async (req, res) => {
  try {
    // 1) Allowed fields
    const allowedFields = ["title", "preview", "price", "categories"];
    const requestedFields = Object.keys(req.body);
    const disallowed = requestedFields.filter((f) => !allowedFields.includes(f));
    if (disallowed.length > 0) {
      return res.status(400).json({
        message: `Disallowed fields: ${disallowed.join(", ")}`,
      });
    }

    // 2) Load minimal fields + optionally populate minimal creator
    const idea = await Idea.findById(req.params.ideaId)
      .select("creator title preview price categories")
      .populate({
        path: "creator",
        select: "username" // only load username & _id
      });

    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    // 3) Ownership check
    if (idea.creator._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this idea." });
    }

    // 4) Update fields
    //    If user wants to update categories, we expect an array of objects { main, sub } in req.body.categories
    if (req.body.title !== undefined) idea.title = req.body.title;
    if (req.body.preview !== undefined) idea.preview = req.body.preview;
    if (req.body.price !== undefined) idea.price = req.body.price;

    if (req.body.categories !== undefined) {
      idea.categories = req.body.categories || [];
      // This will trigger the custom validation for sub if it doesn't match the main
    }

    await idea.save();

    // 5) Minimal final JSON
    const sanitizedCreator = {
      _id: idea.creator._id,
      username: idea.creator.username,
    };

    return res.status(200).json({
      message: "Idea updated successfully",
      idea: {
        _id: idea._id,
        title: idea.title,
        preview: idea.preview,
        price: idea.price,
        categories: idea.categories, // [{ main, sub }]
        creator: sanitizedCreator
      },
    });
  } catch (error) {
    // If sub doesn't match main, you'll get a Mongoose validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /ideas/:ideaId/edit
 * Comprehensive update route for editing an entire idea.
 * Only the creator can use this, and only if the idea hasn't been sold.
 */
router.put("/:ideaId/edit", authProtecter, async (req, res) => {
    try {
        // 1) Find the idea and check if it exists
        const idea = await Idea.findById(req.params.ideaId);
        if (!idea) {
            return res.status(404).json({ message: "Idea not found" });
        }

        // 2) Check if the logged-in user is the creator
        if (idea.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own ideas" });
        }

        // 3) Parse categories if it's a string
        let categories = req.body.categories;
        if (typeof categories === 'string') {
            try {
                categories = JSON.parse(categories);
            } catch (e) {
                return res.status(400).json({ message: "Invalid categories format" });
            }
        }

        // 4) Update fields directly on the document
        if (req.body.title !== undefined) idea.title = req.body.title;
        if (req.body.preview !== undefined) idea.preview = req.body.preview;
        if (req.body.price !== undefined) idea.price = req.body.price;
        if (categories !== undefined) idea.categories = categories;

        // 5) Save the updated idea
        await idea.save();

        // 6) Return the updated idea
        return res.status(200).json({
            message: "Idea updated successfully",
            idea: {
                _id: idea._id,
                title: idea.title,
                preview: idea.preview,
                price: idea.price,
                categories: idea.categories,
                thumbnailImage: idea.thumbnailImage,
                contentImages: idea.contentImages,
                creator: idea.creator,
                isSold: idea.isSold
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            message: "Failed to update idea",
            error: error.message 
        });
    }
});

// Rate an idea - only available to buyers who own the idea
router.post('/:id/rate', authProtecter, async (req, res) => {
    try {
        const { rating } = req.body;
        const ideaId = req.params.id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Find the idea and check if user is the buyer
        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        // Check if the user is the buyer
        if (!idea.buyer || idea.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the buyer of this idea can rate it'
            });
        }

        // Update or create rating
        idea.rating = parseInt(rating);
        idea.ratedAt = new Date().toISOString();

        // Update creator's average rating
        const creatorId = idea.creator;
        const allIdeasByCreator = await Idea.find({ 
            creator: creatorId,
            rating: { $exists: true, $ne: null }
        });

        // Calculate new average rating
        const totalRating = allIdeasByCreator.reduce((sum, idea) => sum + (idea.rating || 0), rating);
        const averageRating = totalRating / (allIdeasByCreator.length + 1);

        // Update creator's average rating
        await User.findByIdAndUpdate(creatorId, {
            averageRating: averageRating
        });

        // Save the idea with new rating
        await idea.save();

        // Return the updated idea data
        res.json({
            success: true,
            message: 'Rating updated successfully',
            idea: {
                _id: idea._id,
                rating: idea.rating,
                ratedAt: idea.ratedAt,
                averageRating: averageRating
            }
        });

    } catch (error) {
        console.error('Error rating idea:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating rating'
        });
    }
});

module.exports = router;
