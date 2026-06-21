require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const PropertyListing = require('../src/models/PropertyListing');

const MONGO_URI = process.env.MONGO_URI;

const agentData = {
  name: 'Sarah Mitchell',
  email: 'sarah.mitchell@nestwell.com',
  password: 'Agent123!',
  role: 'agent',
  emailVerified: true,
  phone: '(555) 234-5678',
  agentProfile: {
    brokerageName: 'Mitchell Realty Group',
    licenseNumber: 'CA-DRE-12345678',
    licenseState: 'CA',
    bio: 'Specializing in luxury and first-time buyer properties across California for 10+ years.',
    yearsOfExperience: 12,
    subscriptionStatus: 'active',
    subscriptionPlan: 'annual',
    subscriptionCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    ratingAverage: 4.8,
    ratingCount: 47,
  },
};

const listings = [
  {
    title: 'Modern Hillside Estate with Bay Views',
    description: 'Perched atop the hills with panoramic bay views, this stunning modern estate offers 5 bedrooms and 4 bathrooms across 4,200 square feet of impeccable design. Floor-to-ceiling windows flood every room with natural light while showcasing the breathtaking scenery. The chef\'s kitchen features custom Italian cabinetry, Miele appliances, and a center island perfect for entertaining.',
    listingType: 'sale',
    propertyType: 'house',
    price: 345000000,
    address: { street: '2847 Hilltop Drive', city: 'San Francisco', state: 'CA', zip: '94131', country: 'US' },
    location: { type: 'Point', coordinates: [-122.4317, 37.7549] },
    features: { bedrooms: 5, bathrooms: 4, squareFootage: 4200, yearBuilt: 2018, garageSpaces: 2, lotSize: 8500 },
    amenities: ['pool', 'gym', 'hardwood_floors', 'air_conditioning', 'walk_in_closet', 'backyard', 'balcony', 'solar_panels'],
    images: [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', publicId: 'seed1a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', publicId: 'seed1b', isCover: false },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', publicId: 'seed1c', isCover: false },
    ],
    status: 'available', viewCount: 284, favoriteCount: 31,
  },
  {
    title: 'Luxury Downtown Penthouse',
    description: 'Sky-high luxury in the heart of downtown Los Angeles. This extraordinary penthouse offers 360-degree city views from every room. Designed by award-winning architects, the open-plan living areas feature soaring 12-foot ceilings, wide-plank oak floors, and a seamless indoor-outdoor flow to the wraparound terrace.',
    listingType: 'sale',
    propertyType: 'condo',
    price: 285000000,
    address: { street: '500 S Grand Ave PH1', city: 'Los Angeles', state: 'CA', zip: '90071', country: 'US' },
    location: { type: 'Point', coordinates: [-118.2537, 34.0522] },
    features: { bedrooms: 3, bathrooms: 3, squareFootage: 3100, yearBuilt: 2019, garageSpaces: 2 },
    amenities: ['pool', 'gym', 'furnished', 'in_unit_laundry', 'doorman', 'elevator', 'balcony', 'air_conditioning'],
    images: [
      { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', publicId: 'seed2a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', publicId: 'seed2b', isCover: false },
      { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', publicId: 'seed2c', isCover: false },
    ],
    status: 'available', viewCount: 412, favoriteCount: 58,
  },
  {
    title: 'Charming Victorian in Capitol Hill',
    description: 'A masterfully restored Victorian home nestled in the heart of Seattle\'s historic Capitol Hill neighborhood. Original character details — hardwood floors, coffered ceilings, and ornate millwork — are seamlessly blended with modern upgrades. The updated kitchen and spa-like bathrooms provide every contemporary convenience.',
    listingType: 'sale',
    propertyType: 'house',
    price: 127500000,
    address: { street: '1432 E Pine St', city: 'Seattle', state: 'WA', zip: '98122', country: 'US' },
    location: { type: 'Point', coordinates: [-122.3101, 47.6148] },
    features: { bedrooms: 4, bathrooms: 2, squareFootage: 2800, yearBuilt: 1905, garageSpaces: 1 },
    amenities: ['hardwood_floors', 'fireplace', 'backyard', 'updated_kitchen', 'walk_in_closet'],
    images: [
      { url: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800', publicId: 'seed3a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', publicId: 'seed3b', isCover: false },
    ],
    status: 'available', viewCount: 189, favoriteCount: 22,
  },
  {
    title: 'Austin Hill Country Retreat',
    description: 'Escape to this stunning 5-bedroom retreat set on 2 private acres in the Texas Hill Country. Soaring ceilings, exposed beams, and walls of glass frame breathtaking views of rolling hills. The resort-style pool and outdoor kitchen make this home an entertainer\'s dream.',
    listingType: 'sale',
    propertyType: 'house',
    price: 189500000,
    address: { street: '7821 Ridgeline Blvd', city: 'Austin', state: 'TX', zip: '78738', country: 'US' },
    location: { type: 'Point', coordinates: [-97.8772, 30.3072] },
    features: { bedrooms: 5, bathrooms: 4, squareFootage: 4500, yearBuilt: 2015, garageSpaces: 3, lotSize: 87120 },
    amenities: ['pool', 'backyard', 'hardwood_floors', 'fireplace', 'air_conditioning', 'walk_in_closet', 'deck_patio', 'ev_charging'],
    images: [
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', publicId: 'seed4a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800', publicId: 'seed4b', isCover: false },
    ],
    status: 'available', viewCount: 327, favoriteCount: 44,
  },
  {
    title: 'Oceanfront Condo in Miami Beach',
    description: 'Wake up to stunning Atlantic Ocean views in this sleek 2-bedroom, 2-bathroom condo on Miami Beach. The open floor plan features designer finishes throughout, a gourmet kitchen, and a private balcony perfect for morning coffee or evening cocktails overlooking the water.',
    listingType: 'sale',
    propertyType: 'condo',
    price: 165000000,
    address: { street: '1450 Ocean Drive Unit 12A', city: 'Miami Beach', state: 'FL', zip: '33139', country: 'US' },
    location: { type: 'Point', coordinates: [-80.1300, 25.7825] },
    features: { bedrooms: 2, bathrooms: 2, squareFootage: 1450, yearBuilt: 2020 },
    amenities: ['pool', 'gym', 'waterfront', 'balcony', 'air_conditioning', 'elevator', 'pet_friendly'],
    images: [
      { url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', publicId: 'seed5a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', publicId: 'seed5b', isCover: false },
    ],
    status: 'available', viewCount: 256, favoriteCount: 33,
  },
  {
    title: 'Modern Mountain View Home',
    description: 'Nestled in the foothills with sweeping Rocky Mountain views, this contemporary 4-bedroom home blends indoor comfort with outdoor adventure. Enjoy the private deck, hot tub, and direct trail access right from your backyard. Recently renovated with designer finishes throughout.',
    listingType: 'sale',
    propertyType: 'house',
    price: 145000000,
    address: { street: '3201 Foothill Rd', city: 'Denver', state: 'CO', zip: '80215', country: 'US' },
    location: { type: 'Point', coordinates: [-105.0892, 39.7392] },
    features: { bedrooms: 4, bathrooms: 3, squareFootage: 3200, yearBuilt: 2012, garageSpaces: 2, lotSize: 15000 },
    amenities: ['hardwood_floors', 'fireplace', 'backyard', 'deck_patio', 'air_conditioning', 'walk_in_closet', 'ev_charging'],
    images: [
      { url: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', publicId: 'seed6a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', publicId: 'seed6b', isCover: false },
    ],
    status: 'available', viewCount: 198, favoriteCount: 27,
  },
  {
    title: 'Marina District Flat',
    description: 'Sophisticated 2-bedroom flat in the heart of San Francisco\'s Marina District. This light-filled home features hardwood floors, a renovated kitchen with marble countertops, and a private patio. Walk to boutique shops, top restaurants, and the waterfront.',
    listingType: 'rent',
    propertyType: 'condo',
    price: 450000,
    address: { street: '2156 Chestnut St Apt 3', city: 'San Francisco', state: 'CA', zip: '94123', country: 'US' },
    location: { type: 'Point', coordinates: [-122.4364, 37.8000] },
    features: { bedrooms: 2, bathrooms: 1, squareFootage: 1150, yearBuilt: 1965 },
    amenities: ['hardwood_floors', 'updated_kitchen', 'deck_patio', 'pet_friendly', 'in_unit_laundry'],
    images: [
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', publicId: 'seed7a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', publicId: 'seed7b', isCover: false },
    ],
    status: 'available', viewCount: 143, favoriteCount: 18,
  },
  {
    title: 'Urban Loft in SoMa',
    description: 'Industrial-chic loft in San Francisco\'s South of Market neighborhood. Exposed brick walls, polished concrete floors, and soaring 14-foot ceilings define this dramatic 1-bedroom, 1-bathroom space. Perfect for creatives or professionals who want to live in the heart of the tech corridor.',
    listingType: 'rent',
    propertyType: 'condo',
    price: 380000,
    address: { street: '888 Brannan St Unit 415', city: 'San Francisco', state: 'CA', zip: '94103', country: 'US' },
    location: { type: 'Point', coordinates: [-122.4058, 37.7749] },
    features: { bedrooms: 1, bathrooms: 1, squareFootage: 1200, yearBuilt: 2001 },
    amenities: ['gym', 'elevator', 'air_conditioning', 'in_unit_laundry', 'pet_friendly', 'balcony'],
    images: [
      { url: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', publicId: 'seed8a', isCover: true },
      { url: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800', publicId: 'seed8b', isCover: false },
    ],
    status: 'available', viewCount: 167, favoriteCount: 21,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean old seed data
    await PropertyListing.deleteMany({ 'images.publicId': /^seed/ });
    await User.deleteMany({ email: 'sarah.mitchell@nestwell.com' });

    // Create agent
    const agent = await User.create(agentData);
    console.log('Created agent:', agent.name);

    // Create listings
    const docs = listings.map((l) => ({ ...l, listedBy: agent._id }));
    const created = await PropertyListing.insertMany(docs);
    console.log(`Created ${created.length} listings`);

    console.log('\n✓ Seed complete!');
    console.log('Agent login: sarah.mitchell@nestwell.com / Agent123!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
