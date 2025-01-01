// /middlewares/optionalAuth.js
const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
  // 1) Try to read from 'token' cookie first
  const tokenFromCookie = req.cookies?.token;

  // 2) Or fallback to Authorization header if needed
  let token = tokenFromCookie;
  if (!token) {
    // fallback: check Authorization header if your design still supports it
    token = req.header("Authorization")?.replace("Bearer ", "");
  }

  // If no token, continue as unauthenticated request
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, continue as unauthenticated request
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
