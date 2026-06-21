const jwt = require('jsonwebtoken');
const { getAuthCookieOptions } = require('./cookies');

const generateToken = (res, userId, role) => {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, getAuthCookieOptions());

  return token;
};

module.exports = generateToken;
