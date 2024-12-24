const mongoose = require("mongoose");
const { S3Client } = require("@aws-sdk/client-s3");

// Connect to MongoDB
const connectToDB = async function () {
  try {
    await mongoose.connect(process.env.ATLAS_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
};

connectToDB();

// Connect to S3

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

module.exports = { mongoose, s3 };
