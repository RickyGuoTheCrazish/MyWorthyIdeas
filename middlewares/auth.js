// /middlewares/authProtecter.js
const jwt = require("jsonwebtoken");

const authProtecter = (req, res, next) => {
  // 1) Try to read from 'token' cookie first
  const tokenFromCookie = req.cookies?.token;

  // 2) Or fallback to Authorization header if needed
  let token = tokenFromCookie;
  if (!token) {
    // fallback: check Authorization header if your design still supports it
    token = req.header("Authorization")?.replace("Bearer ", "");
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Set user._id to match the userId from the token
    req.user = { _id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authProtecter;
