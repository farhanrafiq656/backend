const buildListingQuery = (queryParams) => {
  const {
    q, lat, lng, radiusMiles, boundary,
    listingType, propertyType, minPrice, maxPrice,
    minPricePerSqft, maxPricePerSqft, minHoa, maxHoa,
    minBeds, minBaths, minSqft, maxSqft, minLotSize, maxLotSize,
    minYearBuilt, maxYearBuilt, garageSpaces, parkingType,
    status, daysOnMarket, hasOpenHouse, hasVirtualTour,
    isNewConstruction, priceReduced, isForeclosure, amenities,
    sortBy, page = 1, limit = 20,
  } = queryParams;

  const pipeline = [];
  const matchStage = {};

  const useGeoNear = lat && lng && radiusMiles;
  if (useGeoNear) {
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        distanceField: 'distanceMeters',
        maxDistance: parseFloat(radiusMiles) * 1609.34,
        spherical: true,
        query: {},
      },
    });
  } else if (boundary) {
    let polygon;
    try {
      polygon = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    } catch (_) {}
    if (polygon) {
      matchStage.location = { $geoWithin: { $geometry: polygon } };
    }
  }

  if (q) {
    matchStage.$text = { $search: q };
  }

  if (listingType) matchStage.listingType = listingType;

  if (propertyType) {
    const types = propertyType.split(',').map((t) => t.trim());
    matchStage.propertyType = { $in: types };
  }

  if (minPrice || maxPrice) {
    matchStage.price = {};
    if (minPrice) matchStage.price.$gte = parseInt(minPrice);
    if (maxPrice) matchStage.price.$lte = parseInt(maxPrice);
  }

  if (minPricePerSqft || maxPricePerSqft) {
    matchStage.pricePerSqftCents = {};
    if (minPricePerSqft) matchStage.pricePerSqftCents.$gte = parseInt(minPricePerSqft);
    if (maxPricePerSqft) matchStage.pricePerSqftCents.$lte = parseInt(maxPricePerSqft);
  }

  if (minHoa || maxHoa) {
    matchStage.hoaFeeCents = {};
    if (minHoa) matchStage.hoaFeeCents.$gte = parseInt(minHoa);
    if (maxHoa) matchStage.hoaFeeCents.$lte = parseInt(maxHoa);
  }

  if (minBeds) matchStage['features.bedrooms'] = { $gte: parseFloat(minBeds) };
  if (minBaths) matchStage['features.bathrooms'] = { $gte: parseFloat(minBaths) };

  if (minSqft || maxSqft) {
    matchStage['features.squareFootage'] = {};
    if (minSqft) matchStage['features.squareFootage'].$gte = parseInt(minSqft);
    if (maxSqft) matchStage['features.squareFootage'].$lte = parseInt(maxSqft);
  }

  if (minLotSize || maxLotSize) {
    matchStage['features.lotSize'] = {};
    if (minLotSize) matchStage['features.lotSize'].$gte = parseFloat(minLotSize);
    if (maxLotSize) matchStage['features.lotSize'].$lte = parseFloat(maxLotSize);
  }

  if (minYearBuilt || maxYearBuilt) {
    matchStage['features.yearBuilt'] = {};
    if (minYearBuilt) matchStage['features.yearBuilt'].$gte = parseInt(minYearBuilt);
    if (maxYearBuilt) matchStage['features.yearBuilt'].$lte = parseInt(maxYearBuilt);
  }

  if (garageSpaces) matchStage['features.garageSpaces'] = { $gte: parseInt(garageSpaces) };

  if (parkingType) {
    const types = parkingType.split(',').map((t) => t.trim());
    matchStage['features.parkingType'] = { $in: types };
  }

  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    matchStage.status = { $in: statuses };
  } else {
    matchStage.status = 'available';
  }

  if (daysOnMarket) {
    const now = new Date();
    if (daysOnMarket === 'new') {
      matchStage.listedDate = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
    } else if (daysOnMarket === '30plus') {
      matchStage.listedDate = { $lte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
    } else if (daysOnMarket === '90plus') {
      matchStage.listedDate = { $lte: new Date(now - 90 * 24 * 60 * 60 * 1000) };
    }
  }

  if (hasOpenHouse === 'true' || hasOpenHouse === true) {
    matchStage.openHouseDates = { $elemMatch: { startTime: { $gte: new Date() } } };
  }

  if (hasVirtualTour === 'true' || hasVirtualTour === true) {
    matchStage.virtualTourUrl = { $exists: true, $ne: '' };
  }

  if (isNewConstruction === 'true' || isNewConstruction === true) {
    matchStage.isNewConstruction = true;
  }

  if (priceReduced === 'true' || priceReduced === true) {
    matchStage.priceReducedAt = { $ne: null, $exists: true };
  }

  if (isForeclosure === 'true' || isForeclosure === true) {
    matchStage.isForeclosure = true;
  }

  if (amenities) {
    const amenityList = amenities.split(',').map((a) => a.trim());
    matchStage.amenities = { $all: amenityList };
  }

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  const sortStageMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { listedDate: -1 },
    sqft_desc: { 'features.squareFootage': -1 },
    price_per_sqft_asc: { pricePerSqftCents: 1 },
    days_on_market_desc: { listedDate: 1 },
    relevance: q ? { score: { $meta: 'textScore' } } : { listedDate: -1 },
  };

  const sortStage = sortStageMap[sortBy] || { listedDate: -1 };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  pipeline.push({
    $facet: {
      results: [
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'users',
            localField: 'listedBy',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, avatarUrl: 1, 'agentProfile.brokerageName': 1 } }],
            as: 'listedBy',
          },
        },
        { $unwind: { path: '$listedBy', preserveNullAndEmptyArrays: true } },
      ],
      totalCount: [{ $count: 'count' }],
      amenityCounts: [
        { $unwind: '$amenities' },
        { $group: { _id: '$amenities', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      propertyTypeCounts: [
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
    },
  });

  return { pipeline, pageNum, limitNum };
};

module.exports = buildListingQuery;
