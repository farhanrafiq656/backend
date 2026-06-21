const Lead = require('../models/Lead');
const PropertyListing = require('../models/PropertyListing');

exports.createLead = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const leadData = {
      listing: listing._id,
      agent: listing.listedBy,
      message: req.body.message,
      tourRequested: req.body.tourRequested || false,
      requestedTourTime: req.body.requestedTourTime,
    };

    if (req.user) {
      leadData.user = req.user._id;
    } else {
      if (!req.body.guestContact?.name || !req.body.guestContact?.email) {
        return res.status(400).json({ message: 'Guest contact name and email are required' });
      }
      leadData.guestContact = req.body.guestContact;
    }

    const lead = await Lead.create(leadData);
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
};
