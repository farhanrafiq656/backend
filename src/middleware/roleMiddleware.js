const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden — insufficient permissions' });
  }
  next();
};

const requireActiveSubscription = (req, res, next) => {
  // Bypass in development for testing
  if (process.env.NODE_ENV === 'development') return next();

  const ap = req.user?.agentProfile;
  if (!ap) return res.status(403).json({ message: 'Agent profile not found' });

  const statusOk = ap.subscriptionStatus === 'active' || ap.subscriptionStatus === 'trialing';
  const periodOk = ap.subscriptionCurrentPeriodEnd && new Date(ap.subscriptionCurrentPeriodEnd) > new Date();

  if (!statusOk || !periodOk) {
    return res.status(403).json({ message: 'Active subscription required' });
  }
  next();
};

module.exports = { requireRole, requireActiveSubscription };
