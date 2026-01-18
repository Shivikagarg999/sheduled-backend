const jwt = require("jsonwebtoken");

const driverAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; 
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "driver") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.driver = decoded; // attach driver data to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = driverAuth;