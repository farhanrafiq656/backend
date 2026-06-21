// Stripe is stubbed for testing — replace with real Stripe when ready
const stripe = {
  webhooks: {
    constructEvent: () => ({ id: 'stub', type: 'stub', data: { object: {} } }),
  },
  customers: {
    create: async () => ({ id: 'cus_stub' }),
    retrieve: async () => ({ email: null }),
  },
  checkout: {
    sessions: {
      create: async () => ({ url: 'http://localhost:5173/agent/dashboard?subscribed=stub' }),
    },
  },
  billingPortal: {
    sessions: {
      create: async () => ({ url: 'http://localhost:5173/agent/dashboard' }),
    },
  },
};

module.exports = stripe;
