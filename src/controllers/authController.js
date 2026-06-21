const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail'); // used by forgotPassword
const { getClientUrl } = require('../utils/urls');

const signToken = (res, user) => generateToken(res, user._id, user.role);

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      emailVerified: true, // auto-verified in dev/test mode
    });

    signToken(res, user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      agentProfile: user.agentProfile,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated' });
    }

    signToken(res, user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      agentProfile: user.agentProfile,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out' });
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${getClientUrl()}/reset-password/${rawToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset',
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        });
      } catch (emailErr) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('Email send failed:', emailErr.message);
      }
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = req.body.newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.clearCookie('token');
    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    emailVerified: req.user.emailVerified,
    avatarUrl: req.user.avatarUrl,
    phone: req.user.phone,
    savedListings: req.user.savedListings,
    agentProfile: req.user.agentProfile,
  });
};
