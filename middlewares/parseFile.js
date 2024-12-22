// /middlewares/parseFile.js

const formidable = require("formidable").default;
const { Transform } = require("stream");
const { Upload } = require("@aws-sdk/lib-storage");
const { s3 } = require("../db/connection");

/**
 * parseFile
 * @param {Object} req - The Express request
 * @param {String} folderName - e.g. "profile-images", "cover-images", "content-images"
 * @param {String} prefix - e.g. a userId or ideaId
 * @param {Number} [maxFiles=1] - how many files to allow at once
 * @returns {Promise<String[]>} resolves to array of S3 URLs
 */
const parseFile = async (req, folderName, prefix, maxFiles = 1) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFieldsSize: 10 * 1024 * 1024, // 10 MB total for fields
      maxFields: 1, // we assume we don't need text fields; you can remove or change
      maxFiles, // dynamically control how many files can be uploaded
      allowEmptyFiles: false,
    });

    const uploadPromises = [];
    const uploadResult = [];

    form.parse(req, (err) => {
      if (err) {
        return reject(err);
      }
      // Resolve after all uploadPromises complete
      Promise.all(uploadPromises)
        .then(() => resolve(uploadResult))
        .catch((uploadErr) => reject(uploadErr));
    });

    // Called for each file
    form.on("fileBegin", (name, file) => {
      // Create a pass-through transform stream
      const uploadStream = new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk);
          callback();
        },
      });

      uploadStream.on("error", (streamErr) => reject(streamErr));

      // Attach the transform stream to formidable’s file
      file._writeStream = uploadStream;

      // Override file.open to trigger our custom upload logic
      file.open = () => {
        // Optional: validate file MIME type
        const validTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!validTypes.includes(file.mimetype)) {
          form.emit("error", new Error("Invalid file type"));
          return;
        }

        // Build an S3 key => folderName/prefix/<timestamp>-<originalFilename>
        // e.g.: "content-images/idea-123/1676304800000-myImage.png"
        const timeStamp = Date.now().toString();
        const s3Key = `${folderName}/${prefix}/${timeStamp}-${file.originalFilename}`;

        const uploadPromise = new Upload({
          client: s3,
          params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: uploadStream,
            ACL: "public-read", // or remove if you want a private file
          },
          queueSize: 5, // how many parts can be uploaded concurrently
          partSize: 10 * 1024 * 1024, // 10 MB
          leavePartsOnError: false,
        })
          .done()
          .then((data) => {
            console.log("Uploaded successfully:", data.Location);
            uploadResult.push(data.Location);
          })
          .catch((uploadErr) => {
            console.error("Upload failed", uploadErr);
            form.emit("error", uploadErr);
          });

        uploadPromises.push(uploadPromise);
      };

      // Called when the file ends
      file.end = (callback) => {
        uploadStream.on("finish", () => {
          console.log("File upload finished for:", file.originalFilename);
          callback();
        });
        uploadStream.end();
      };
    });

    form.on("error", (formErr) => {
      console.error("Form parse error:", formErr);
      reject(formErr);
    });
  });
};

module.exports = parseFile;
