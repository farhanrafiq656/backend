const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestContact: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    message: { type: String, required: true, maxlength: 1000 },
    tourRequested: { type: Boolean, default: false },
    requestedTourTime: { type: Date },
    status: {
      type: String,
      enum: ['new', 'contacted', 'scheduled', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

leadSchema.index({ agent: 1, createdAt: -1 });
leadSchema.index({ listing: 1 });

module.exports = mongoose.model('Lead', leadSchema);
