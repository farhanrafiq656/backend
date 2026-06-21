const mongoose = require('mongoose');
const User = require('./User');

const reviewSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger } },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ agent: 1 });
reviewSchema.index({ agent: 1, reviewer: 1 }, { unique: true });

async function recomputeAgentRating(agentId) {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { agent: agentId } },
    { $group: { _id: '$agent', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length ? stats[0].avg : 0;
  const count = stats.length ? stats[0].count : 0;
  await User.findByIdAndUpdate(agentId, {
    'agentProfile.ratingAverage': Math.round(avg * 10) / 10,
    'agentProfile.ratingCount': count,
  });
}

reviewSchema.post('save', async function () {
  await recomputeAgentRating(this.agent);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recomputeAgentRating(doc.agent);
});

module.exports = mongoose.model('Review', reviewSchema);
