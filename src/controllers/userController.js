const User = require('../models/User');
const SavedSearch = require('../models/SavedSearch');
const PropertyListing = require('../models/PropertyListing');
const generateToken = require('../utils/generateToken');

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'avatarUrl'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

exports.saveListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const user = req.user;
    const alreadySaved = user.savedListings.map(String).includes(listingId);

    if (alreadySaved) {
      await User.findByIdAndUpdate(user._id, { $pull: { savedListings: listingId } });
      await PropertyListing.findByIdAndUpdate(listingId, { $inc: { favoriteCount: -1 } });
      return res.json({ saved: false });
    }

    const listing = await PropertyListing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    await User.findByIdAndUpdate(user._id, { $addToSet: { savedListings: listingId } });
    await PropertyListing.findByIdAndUpdate(listingId, { $inc: { favoriteCount: 1 } });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};

exports.getSavedListings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedListings',
      select: 'title price listingType propertyType address images features status listedBy',
      populate: { path: 'listedBy', select: 'name avatarUrl' },
    });
    res.json(user.savedListings);
  } catch (err) {
    next(err);
  }
};

exports.createSavedSearch = async (req, res, next) => {
  try {
    const { name, filters, alertFrequency } = req.body;
    const saved = await SavedSearch.create({ user: req.user._id, name, filters, alertFrequency });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedSearches: saved._id } });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

exports.getSavedSearches = async (req, res, next) => {
  try {
    const searches = await SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(searches);
  } catch (err) {
    next(err);
  }
};

exports.deleteSavedSearch = async (req, res, next) => {
  try {
    const search = await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!search) return res.status(404).json({ message: 'Saved search not found' });
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedSearches: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

exports.becomeAgent = async (req, res, next) => {
  try {
    const { brokerageName, licenseNumber, licenseState, bio, yearsOfExperience } = req.body;

    if (req.user.role === 'agent') {
      return res.status(400).json({ message: 'You are already an agent' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        role: 'agent',
        agentProfile: {
          brokerageName: brokerageName || 'Independent',
          licenseNumber: licenseNumber || '',
          licenseState: licenseState || '',
          bio: bio || '',
          yearsOfExperience: parseInt(yearsOfExperience) || 0,
          subscriptionStatus: 'active',
          subscriptionPlan: 'monthly',
          subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ratingAverage: 0,
          ratingCount: 0,
        },
      },
      { new: true, runValidators: true }
    ).select('-password');

    // Re-issue JWT with updated role
    generateToken(res, user._id, user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      agentProfile: user.agentProfile,
    });
  } catch (err) {
    next(err);
  }
};
