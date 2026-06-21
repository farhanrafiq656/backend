const stripe = require('../config/stripe');
const User = require('../models/User');

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const priceId = plan === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;

    let customerId = req.user.agentProfile?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, { 'agentProfile.stripeCustomerId': customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/agent/dashboard?subscribed=true`,
      cancel_url: `${process.env.CLIENT_URL}/become-agent?canceled=true`,
      client_reference_id: req.user._id.toString(),
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

exports.createPortalSession = async (req, res, next) => {
  try {
    const customerId = req.user.agentProfile?.stripeCustomerId;
    if (!customerId) return res.status(400).json({ message: 'No Stripe customer found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/agent/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};
