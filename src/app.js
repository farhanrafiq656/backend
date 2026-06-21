require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const stripeWebhook = require('./webhooks/stripeWebhook');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const listingRoutes = require('./routes/listingRoutes');
const agentRoutes = require('./routes/agentRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const aiRoutes = require('./routes/aiRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');
const { isAllowedOrigin } = require('./utils/urls');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (isAllowedOrigin(requestOrigin)) {
    if (requestOrigin) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Internal-Api-Key'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

// Stripe webhook needs raw body — mount before express.json()
app.use('/api/stripe/webhook', stripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
