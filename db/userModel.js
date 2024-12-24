// /db/userModel.js
const { mongoose } = require("./connection");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    subscription: {
      type: String,
      enum: ["none", "buyer", "seller", "premium"],
      default: "none",
    },

    /**
     * postedIdeas => for sellers to track ideas they've created
     */
    postedIdeas: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Idea" },
    ],

    /**
     * boughtIdeas => for buyers to track ideas they've purchased
     */
    boughtIdeas: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Idea" },
    ],

    /**
     * AWS S3 profile image link
     */
    profileImage: { type: String, default: "" },

    /**
     * credits => how many credits the user (as a buyer) has
     */
    credits: {
      type: Number,
      default: 0,
    },

    /**
     * earnings => how much this user (as a seller) has earned
     */
    earnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
