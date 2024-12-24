// /db/ideaModel.js

const { mongoose } = require("./connection");

const ideaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    preview: { type: String, required: true },

    /**
     * The raw editor data (JSON) from a WYSIWYG if you want
     * to restore the user's formatting exactly.
     */
    contentRaw: {
      type: mongoose.Schema.Types.Mixed, // or { type: Object, default: {} }
      default: {},
    },

    /**
     * The pre-rendered HTML version (if you want to quickly display it).
     * Might be sanitized or already safe to inject in the frontend.
     */
    contentHtml: {
      type: String,
      default: "",
    },

    price: { type: Number, required: true },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSold: { type: Boolean, default: false },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    boughtAt: { type: Date, default: null },

    thumbnailImage: { type: String, default: "" },
    contentImages: [{ type: String }],

    rating: { type: Number, min: 0, max: 5, default: null },
    category: { type: String, default: "" },
  },
  { timestamps: true }
);

const IdeaModel = mongoose.model("Idea", ideaSchema);
module.exports = IdeaModel;
