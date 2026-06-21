const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const agentProfileSchema = new mongoose.Schema({
  brokerageName: { type: String },
  licenseNumber: { type: String },
  licenseState: { type: String },
  bio: { type: String, maxlength: 1000 },
  yearsOfExperience: { type: Number, min: 0 },
  socialLinks: {
    website: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
    facebook: { type: String },
  },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  subscriptionStatus: {
    type: String,
    enum: ['none', 'trialing', 'active', 'past_due', 'canceled'],
    default: 'none',
  },
  subscriptionPlan: { type: String, enum: ['monthly', 'annual'] },
  subscriptionCurrentPeriodEnd: { type: Date },
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    avatarUrl: { type: String, default: '' },
    phone: { type: String },
    savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' }],
    favoriteAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    searchHistory: {
      type: [{ query: { type: Object }, searchedAt: { type: Date, default: Date.now } }],
      default: [],
    },
    savedSearches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SavedSearch' }],
    agentProfile: { type: agentProfileSchema },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ 'agentProfile.licenseNumber': 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
