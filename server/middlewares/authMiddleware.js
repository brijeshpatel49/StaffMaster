import jwt from "jsonwebtoken";
import User from "../models/User.js";

const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
          tokenExpired: false,
        });
      }

      next();
    } else {
      res.status(401).json({
        success: false,
        message: "Not authorized, no token",
        tokenExpired: false,
      });
    }
  } catch (error) {
    console.error(error);

    // Check if error is specifically token expiration
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired, please login again",
        tokenExpired: true,
      });
    }

    res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
      tokenExpired: false,
    });
  }
};

export default verifyToken;
