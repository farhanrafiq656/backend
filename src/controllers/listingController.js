const path = require('path');
const fs = require('fs');
const PropertyListing = require('../models/PropertyListing');
const geocode = require('../utils/geocode');
const buildListingQuery = require('../utils/buildListingQuery');

const deleteLocalFile = (publicId) => {
  if (!publicId) return;
  try {
    const filePath = path.join(__dirname, '../../public/uploads', publicId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
};

exports.createListing = async (req, res, next) => {
  try {
    const addressStr = `${req.body.address?.street}, ${req.body.address?.city}, ${req.body.address?.state} ${req.body.address?.zip}`;
    const coords = await geocode(addressStr);
    if (!coords) {
      return res.status(400).json({ message: 'Could not geocode the provided address. Please refine it.' });
    }

    const listing = await PropertyListing.create({
      ...req.body,
      listedBy: req.user._id,
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      priceHistory: [{ price: req.body.price, changedAt: new Date() }],
    });

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
};

exports.getListing = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.id).populate(
      'listedBy',
      'name avatarUrl phone agentProfile.brokerageName agentProfile.ratingAverage agentProfile.ratingCount'
    );
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const viewCookieKey = `viewed_${req.params.id}`;
    if (!req.cookies?.[viewCookieKey]) {
      await PropertyListing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
      res.cookie(viewCookieKey, '1', { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    }

    res.json(listing);
  } catch (err) {
    next(err);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const isOwner = listing.listedBy.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const updates = { ...req.body };

    if (req.body.address) {
      const addressStr = `${req.body.address?.street}, ${req.body.address?.city}, ${req.body.address?.state} ${req.body.address?.zip}`;
      const coords = await geocode(addressStr);
      if (!coords) return res.status(400).json({ message: 'Could not geocode the updated address' });
      updates.location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
    }

    if (req.body.price && req.body.price < listing.price) {
      updates.priceReducedAt = new Date();
      updates.priceHistory = [...(listing.priceHistory || []), { price: req.body.price, changedAt: new Date() }];
    } else if (req.body.price && req.body.price > listing.price) {
      updates.priceReducedAt = null;
      updates.priceHistory = [...(listing.priceHistory || []), { price: req.body.price, changedAt: new Date() }];
    }

    const updated = await PropertyListing.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const isOwner = listing.listedBy.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    for (const img of listing.images) {
      deleteLocalFile(img.publicId);
    }

    await listing.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getListingsByAgent = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const listings = await PropertyListing.find({ listedBy: req.params.agentId })
      .sort({ listedDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('title price listingType propertyType address images features status viewCount favoriteCount listedDate');

    const total = await PropertyListing.countDocuments({ listedBy: req.params.agentId });
    res.json({ results: listings, pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.searchListings = async (req, res, next) => {
  try {
    const { pipeline, pageNum, limitNum } = buildListingQuery(req.query);
    const [data] = await PropertyListing.aggregate(pipeline);

    const results = data?.results || [];
    const totalCount = data?.totalCount?.[0]?.count || 0;
    const amenities = (data?.amenityCounts || []).map((a) => ({ value: a._id, count: a.count }));
    const propertyType = (data?.propertyTypeCounts || []).map((p) => ({ value: p._id, count: p.count }));

    res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      facets: { amenities, propertyType },
    });
  } catch (err) {
    next(err);
  }
};

exports.addImage = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (!listing.listedBy.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (listing.images.length >= 25) {
      return res.status(400).json({ message: 'Maximum 25 images per listing' });
    }

    const { url, publicId, isCover } = req.body;

    if (isCover) {
      listing.images.forEach((img) => { img.isCover = false; });
    }

    listing.images.push({ url, publicId, isCover: !!isCover });
    await listing.save();
    res.json(listing);
  } catch (err) {
    next(err);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (!listing.listedBy.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const publicId = decodeURIComponent(req.params.publicId);
    deleteLocalFile(publicId);

    listing.images = listing.images.filter((img) => img.publicId !== publicId);
    await listing.save();
    res.json(listing);
  } catch (err) {
    next(err);
  }
};
