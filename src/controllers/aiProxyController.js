const axios = require('axios');
const PropertyListing = require('../models/PropertyListing');

const aiClient = () =>
  axios.create({
    baseURL: process.env.AI_SERVICE_URL,
    headers: { 'X-Internal-Api-Key': process.env.AI_SERVICE_INTERNAL_KEY },
    timeout: 30000,
  });

exports.generateDescription = async (req, res, next) => {
  try {
    const response = await aiClient().post('/api/ai/generate-description', req.body);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.detail || 'AI service error';
    res.status(status).json({ message });
  }
};

exports.analyzeMarket = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    const subject = await PropertyListing.findById(listingId).lean();
    if (!subject) return res.status(404).json({ message: 'Listing not found' });

    const comps = await PropertyListing.find({
      'address.zip': subject.address.zip,
      'features.bedrooms': { $gte: subject.features.bedrooms - 1, $lte: subject.features.bedrooms + 1 },
      'features.squareFootage': {
        $gte: Math.round(subject.features.squareFootage * 0.8),
        $lte: Math.round(subject.features.squareFootage * 1.2),
      },
      status: { $in: ['sold', 'available'] },
      listedDate: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      _id: { $ne: subject._id },
    })
      .limit(10)
      .lean();

    const toSummary = (l) => ({
      city: l.address.city,
      state: l.address.state,
      price: l.price,
      bedrooms: l.features.bedrooms,
      bathrooms: l.features.bathrooms,
      squareFootage: l.features.squareFootage,
      yearBuilt: l.features.yearBuilt,
      status: l.status,
      listedDate: l.listedDate,
    });

    const payload = {
      subject_property: toSummary(subject),
      comparable_properties: comps.map(toSummary),
    };

    const response = await aiClient().post('/api/ai/analyze-market', payload);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.detail || 'AI service error';
    res.status(status).json({ message });
  }
};

function buildRagQuery(filters) {
  const q = { status: 'available' };
  if (filters.listingType) q.listingType = filters.listingType;
  if (filters.propertyType) q.propertyType = filters.propertyType;
  if (filters.city) q['address.city'] = new RegExp(filters.city, 'i');
  if (filters.state) q['address.state'] = new RegExp(filters.state, 'i');
  if (filters.minPrice || filters.maxPrice) {
    q.price = {};
    if (filters.minPrice) q.price.$gte = parseInt(filters.minPrice) * 100;
    if (filters.maxPrice) q.price.$lte = parseInt(filters.maxPrice) * 100;
  }
  if (filters.minBeds) q['features.bedrooms'] = { $gte: parseFloat(filters.minBeds) };
  if (filters.minBaths) q['features.bathrooms'] = { $gte: parseFloat(filters.minBaths) };
  if (filters.minSqft || filters.maxSqft) {
    q['features.squareFootage'] = {};
    if (filters.minSqft) q['features.squareFootage'].$gte = parseInt(filters.minSqft);
    if (filters.maxSqft) q['features.squareFootage'].$lte = parseInt(filters.maxSqft);
  }
  return q;
}

const SEARCH_INTENT_KEYWORDS = [
  'show', 'find', 'list', 'search', 'looking for', 'want', 'need', 'browse',
  'bedroom', 'bath', 'house', 'condo', 'apartment', 'home', 'property', 'rent', 'buy',
  'available', 'listing', 'under', 'above', 'cheap', 'affordable', 'luxury',
];

function hasSearchIntent(message) {
  const lower = message.toLowerCase();
  return SEARCH_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

exports.chat = async (req, res, next) => {
  try {
    // Step 1: Call AI service for reply + filter extraction
    const aiRes = await aiClient().post('/api/ai/chat', req.body);
    const { reply, extracted_filters } = aiRes.data;

    // Step 2: RAG — query DB if filters extracted or message has search intent
    let listings = [];
    const filtersHaveData = extracted_filters && Object.values(extracted_filters).some(Boolean);
    const searchIntent = hasSearchIntent(req.body.message || '');

    if (filtersHaveData || (searchIntent && !filtersHaveData)) {
      const ragQuery = filtersHaveData ? buildRagQuery(extracted_filters) : { status: 'available' };
      const rawListings = await PropertyListing.find(ragQuery)
        .sort({ viewCount: -1 })
        .limit(4)
        .select('title price listingType propertyType address images features status _id')
        .lean();

      listings = rawListings.map((l) => ({
        _id: l._id,
        title: l.title,
        price: l.price,
        listingType: l.listingType,
        propertyType: l.propertyType,
        address: l.address,
        features: l.features,
        status: l.status,
        image: l.images?.find((i) => i.isCover)?.url || l.images?.[0]?.url || null,
      }));
    }

    res.json({ reply, extracted_filters, listings });
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.detail || 'AI service error';
    res.status(status).json({ message });
  }
};
