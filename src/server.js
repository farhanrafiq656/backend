require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const cron = require('node-cron');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  // Saved-search alert cron — runs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const SavedSearch = require('./models/SavedSearch');
      const PropertyListing = require('./models/PropertyListing');
      const User = require('./models/User');
      const sendEmail = require('./utils/sendEmail');
      const buildListingQuery = require('./utils/buildListingQuery');

      const searches = await SavedSearch.find({ alertsEnabled: true }).populate('user', 'email name');
      for (const search of searches) {
        if (!search.user) continue;

        const params = { ...search.filters, page: 1, limit: 5 };
        const { pipeline } = buildListingQuery(params);

        const matchLastNotified = { $match: { createdAt: { $gte: search.lastNotifiedAt } } };
        const fullPipeline = [matchLastNotified, ...pipeline];

        try {
          const [data] = await PropertyListing.aggregate(fullPipeline);
          const results = data?.results || [];
          if (results.length > 0) {
            await sendEmail({
              to: search.user.email,
              subject: `New listings for "${search.name}"`,
              html: `<p>Hi ${search.user.name},<br>${results.length} new listing(s) matched your saved search "${search.name}".</p>`,
            });
            search.lastNotifiedAt = new Date();
            await search.save();
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Cron error:', err.message);
    }
  });
});
