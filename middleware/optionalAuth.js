const jwt = require('jsonwebtoken');
const User = require('../models/user');

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user; // attach user if token is valid
    } catch (err) {
      console.warn('Optional Auth: Invalid or expired token');
    }
  }

  next(); 
};

module.exports = optionalAuth;
