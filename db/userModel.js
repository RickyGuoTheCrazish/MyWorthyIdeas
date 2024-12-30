// /db/userModel.js
const { mongoose } = require("./connection");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    subscription: {
      type: String,
      enum: ["none", "buyer", "seller", "premium"],
      default: "none",
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: "" },
    verificationTokenExp: { type: Date }, // expires in 10 min
    lastVerificationSentAt: { type: Date }, // track the last time we sent
    postedIdeas: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Idea" },
    ],
    boughtIdeas: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Idea" },
    ],
    profileImage: { type: String, default: "" },
    credits: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/**
 * Virtual: averageRating
 * We'll compute the average rating from the user's postedIdeas
 * (which each have a 'rating' field).
 *
 * NOTE: This only works if postedIdeas are already populated
 * with their rating fields. e.g.:
 *    await user.populate({ path: 'postedIdeas', select: 'rating' });
 * Then user.averageRating can be used in code or JSON output.
 */
userSchema.virtual("averageRating").get(function() {
  if (!this.postedIdeas || this.postedIdeas.length === 0) {
    return 0;
  }

  let sum = 0;
  let count = 0;
  for (const idea of this.postedIdeas) {
    if (idea.rating != null) {
      sum += idea.rating;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
});

// Create indexes for unique fields
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// If you want the virtual to appear in JSON output, enable it:
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
