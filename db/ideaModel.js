// /models/Idea.js
const mongoose = require("mongoose");
const db = mongoose.connection.useDb("IdeasForce");

const ideaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    preview: {
      type: String,
      required: true,
    },
    content: {
      // store your text content (potentially with markup for bold, italic, new lines, etc.)
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSold: {
      type: Boolean,
      default: false,
    },
    thumbnailImage: {
      type: String,
      default: "",
    },
    contentImages: [
      {
        type: String, // each is an S3 URL
      },
    ],
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = db.model("Idea", ideaSchema);
