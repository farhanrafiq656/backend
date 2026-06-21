const Stripe = require('stripe');
const { getClientUrl } = require('../utils/urls');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : {
  webhooks: {
    constructEvent: () => ({ id: 'stub', type: 'stub', data: { object: {} } }),
  },
  customers: {
    create: async () => ({ id: 'cus_stub' }),
    retrieve: async () => ({ email: null }),
  },
  checkout: {
    sessions: {
      create: async () => ({ url: `${getClientUrl()}/agent/dashboard?subscribed=stub` }),
    },
  },
  billingPortal: {
    sessions: {
      create: async () => ({ url: `${getClientUrl()}/agent/dashboard` }),
    },
  },
};

module.exports = stripe;
