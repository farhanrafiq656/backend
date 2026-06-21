const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    filters: { type: Object, required: true },
    alertsEnabled: { type: Boolean, default: true },
    alertFrequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'daily',
    },
    lastNotifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

savedSearchSchema.index({ user: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
