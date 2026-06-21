const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  req.user = user;
  next();
};

module.exports = { protect };
