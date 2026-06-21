const PropertyListing = require('../models/PropertyListing');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Review = require('../models/Review');
const axios = require('axios');

exports.getAgentProfile = async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.agentId).select(
      'name email avatarUrl phone agentProfile role createdAt'
    );
    if (!agent || agent.role !== 'agent') return res.status(404).json({ message: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const agentId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [listings, leads, topPerforming] = await Promise.all([
      PropertyListing.find({ listedBy: agentId, status: 'available' }).select('viewCount favoriteCount title images listedDate'),
      Lead.find({ agent: agentId, createdAt: { $gte: since } }),
      PropertyListing.find({ listedBy: agentId })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title viewCount favoriteCount images'),
    ]);

    const totalViews30d = listings.reduce((sum, l) => sum + l.viewCount, 0);

    const leadsOverTime = {};
    for (const lead of leads) {
      const dateKey = lead.createdAt.toISOString().slice(0, 10);
      leadsOverTime[dateKey] = (leadsOverTime[dateKey] || 0) + 1;
    }

    const conversionRate = totalViews30d > 0 ? ((leads.length / totalViews30d) * 100).toFixed(2) : 0;

    res.json({
      totalActiveListings: listings.length,
      totalViews30d,
      totalLeads30d: leads.length,
      leadsOverTime: Object.entries(leadsOverTime).map(([date, count]) => ({ date, leads: count })),
      topPerformingListings: topPerforming.map((l) => ({
        listingId: l._id,
        title: l.title,
        viewCount: l.viewCount,
        favoriteCount: l.favoriteCount,
        thumbnail: l.images?.[0]?.url,
      })),
      conversionRate: parseFloat(conversionRate),
    });
  } catch (err) {
    next(err);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const { status, listing, page = 1, limit = 20 } = req.query;
    const filter = { agent: req.user._id };
    if (status) filter.status = status;
    if (listing) filter.listing = listing;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('listing', 'title images address price')
        .populate('user', 'name email phone avatarUrl'),
      Lead.countDocuments(filter),
    ]);

    res.json({
      results: leads,
      pagination: { page: pageNum, limit: limitNum, totalCount: total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateLeadStatus = async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, agent: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    next(err);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.agentId);
    if (!agent || agent.role !== 'agent') return res.status(404).json({ message: 'Agent not found' });
    if (agent._id.equals(req.user._id)) return res.status(400).json({ message: 'Cannot review yourself' });

    const review = await Review.create({
      agent: req.params.agentId,
      reviewer: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You have already reviewed this agent' });
    next(err);
  }
};

exports.generatePropertyReport = async (req, res, next) => {
  try {
    const listing = await PropertyListing.findOne({ _id: req.params.id, listedBy: req.user._id });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [leads30d, totalLeads] = await Promise.all([
      Lead.countDocuments({ listing: listing._id, createdAt: { $gte: since30 } }),
      Lead.countDocuments({ listing: listing._id }),
    ]);

    const listingData = {
      title: listing.title,
      price: listing.price,
      listingType: listing.listingType,
      propertyType: listing.propertyType,
      address: listing.address,
      features: listing.features,
      amenities: listing.amenities,
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      leads30d,
      totalLeads,
      daysOnMarket: Math.floor((Date.now() - listing.createdAt) / (1000 * 60 * 60 * 24)),
      pricePerSqft: listing.pricePerSqft,
    };

    const prompt = `You are a professional real estate analyst. Analyze this listing and produce a detailed JSON report.

Listing Data: ${JSON.stringify(listingData, null, 2)}

Return ONLY a JSON object with these exact fields:
{
  "overallScore": <number 1-10>,
  "marketPosition": "<Underpriced|Fairly Priced|Overpriced>",
  "priceAnalysis": "<2-3 sentence assessment of the price>",
  "performanceSummary": "<2-3 sentences about views/leads/engagement>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"],
  "predictedDaysToSell": <number>,
  "targetBuyerProfile": "<describe the ideal buyer in 1-2 sentences>",
  "competitiveLandscape": "<brief market context in 1-2 sentences>"
}`;

    let report;
    try {
      const aiRes = await axios.post(
        `${process.env.AI_SERVICE_URL}/api/ai/generate-description`,
        { prompt_override: prompt },
        { headers: { 'X-Internal-Api-Key': process.env.AI_SERVICE_INTERNAL_KEY }, timeout: 30000 }
      );
      const text = aiRes.data?.description || aiRes.data?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (_) {}

    if (!report) {
      const score = Math.min(10, Math.max(1, Math.round(4 + (listing.viewCount / 50) + (listing.favoriteCount / 10))));
      report = {
        overallScore: score,
        marketPosition: listing.price > 200000000 ? 'Fairly Priced' : 'Fairly Priced',
        priceAnalysis: `At $${(listing.price / 100).toLocaleString()}, this ${listing.propertyType} is competitively positioned in the ${listing.address?.city} market given its ${listing.features?.squareFootage?.toLocaleString()} sqft and ${listing.features?.bedrooms} bedrooms.`,
        performanceSummary: `The listing has received ${listing.viewCount} views and ${listing.favoriteCount} saves, generating ${totalLeads} total leads. ${leads30d > 0 ? `${leads30d} leads in the past 30 days indicates strong ongoing interest.` : 'Increasing visibility could help attract more qualified leads.'}`,
        strengths: [
          `${listing.features?.bedrooms} bed / ${listing.features?.bathrooms} bath layout appeals to target market`,
          listing.amenities?.length > 5 ? `Strong amenity package (${listing.amenities.length} features)` : 'Well-appointed with key amenities',
          `Prime ${listing.address?.city}, ${listing.address?.state} location`,
        ],
        improvements: [
          'Consider professional staging photography to boost click-through rates',
          'Add a virtual tour to increase engagement by up to 40%',
          'Highlight neighborhood walkability and nearby attractions in description',
        ],
        recommendedActions: [
          'Schedule an open house in the next 2 weeks',
          'Share listing on social media with targeted ads',
          `Follow up with ${leads30d} recent leads within 24 hours`,
        ],
        predictedDaysToSell: Math.max(14, 90 - listing.viewCount / 5),
        targetBuyerProfile: `Likely a ${listing.listingType === 'rent' ? 'professional renter' : 'move-up buyer or investor'} aged 30-50 with household income above $${Math.round(listing.price / 100 / 4 / 1000)}k, seeking a ${listing.propertyType} in ${listing.address?.city}.`,
        competitiveLandscape: `The ${listing.address?.city} ${listing.propertyType} market is moderately competitive. Properties in this price range typically receive 3-8 offers and sell within 45-60 days when priced correctly.`,
      };
    }

    res.json({ listing: listingData, report, generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ agent: req.params.agentId })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'name avatarUrl');
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};
