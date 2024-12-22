// /models/User.js

const mongoose = require("mongoose");
const db = mongoose.connection.useDb("IdeasForce");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    subscription: {
      type: String,
      enum: ["none", "buyer", "seller", "premium"],
      default: "none",
    },
    /**
     * For a seller, track all ideas the user has posted.
     * You can populate these to retrieve the Idea docs.
     */
    postedIdeas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Idea",
      },
    ],
    /**
     * For a buyer, track all ideas the user has purchased,
     * and optionally store the rating they gave each idea.
     */
    boughtIdeas: [
      {
        idea: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Idea",
        },
        rating: {
          type: Number,
          min: 0,
          max: 5,
          default: null, // null or undefined if not rated yet
        },
      },
    ],

    /**
     * AWS S3 profile image link
     */
    profileImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = db.model("User", userSchema);
