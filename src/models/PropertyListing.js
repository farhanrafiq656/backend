const mongoose = require('mongoose');

const AMENITIES = [
  'air_conditioning', 'in_unit_laundry', 'fireplace', 'hardwood_floors',
  'updated_kitchen', 'walk_in_closet', 'finished_basement', 'unfinished_basement',
  'pool', 'backyard', 'deck_patio', 'balcony', 'fenced_yard', 'waterfront',
  'mountain_view', 'ocean_view', 'elevator', 'gym', 'doorman', 'gated_community',
  'pet_friendly', 'furnished', 'ada_accessible', 'solar_panels', 'ev_charging',
];

const featuresSchema = new mongoose.Schema({
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  squareFootage: { type: Number, min: 0 },
  lotSize: { type: Number, min: 0 },
  lotSizeUnit: { type: String, enum: ['sqft', 'acres'], default: 'sqft' },
  yearBuilt: { type: Number, min: 1700, max: new Date().getFullYear() },
  stories: { type: Number, min: 1 },
  garageSpaces: { type: Number, min: 0 },
  parkingType: { type: String, enum: ['garage', 'driveway', 'street', 'none'] },
}, { _id: false });

const propertyListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    listingType: { type: String, enum: ['sale', 'rent'], required: true },
    propertyType: {
      type: String,
      enum: ['house', 'condo', 'townhouse', 'multi-family', 'land', 'commercial', 'manufactured'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    pricePerSqftCents: { type: Number },
    hoaFeeCents: { type: Number, default: 0 },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      neighborhood: { type: String },
    },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        isCover: { type: Boolean, default: false },
      },
    ],
    features: { type: featuresSchema, required: true },
    amenities: [{ type: String, enum: AMENITIES }],
    status: {
      type: String,
      enum: ['available', 'pending', 'sold', 'off-market', 'coming-soon'],
      default: 'available',
    },
    isNewConstruction: { type: Boolean, default: false },
    isForeclosure: { type: Boolean, default: false },
    priceReducedAt: { type: Date },
    priceHistory: [{ price: Number, changedAt: { type: Date, default: Date.now } }],
    virtualTourUrl: { type: String },
    openHouseDates: [{ startTime: Date, endTime: Date }],
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listedDate: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

propertyListingSchema.index({ location: '2dsphere' });
propertyListingSchema.index({ price: 1, listingType: 1, status: 1 });
propertyListingSchema.index({ 'features.bedrooms': 1, 'features.bathrooms': 1 });
propertyListingSchema.index({ listedBy: 1 });
propertyListingSchema.index({ status: 1, listedDate: -1 });
propertyListingSchema.index({ title: 'text', description: 'text', 'address.city': 'text' });

propertyListingSchema.pre('save', function (next) {
  if (this.features && this.features.squareFootage && this.price) {
    this.pricePerSqftCents = Math.round(this.price / this.features.squareFootage);
  }
  next();
});

module.exports = mongoose.model('PropertyListing', propertyListingSchema);
