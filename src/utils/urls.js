const DEFAULT_CLIENT_URL = 'https://nest-well.netlify.app';
const LOCAL_CLIENT_URL = 'http://localhost:5173';

function normalizeUrl(url) {
  return url ? url.replace(/\/+$/, '') : '';
}

function getClientUrl() {
  return normalizeUrl(process.env.CLIENT_URL || DEFAULT_CLIENT_URL);
}

function getAllowedOrigins() {
  const origins = new Set([LOCAL_CLIENT_URL, DEFAULT_CLIENT_URL]);

  const envOrigins = process.env.CLIENT_URLS
    ? process.env.CLIENT_URLS.split(',').map((origin) => normalizeUrl(origin.trim())).filter(Boolean)
    : [];

  for (const origin of envOrigins) {
    origins.add(origin);
  }

  const clientUrl = getClientUrl();
  if (clientUrl) origins.add(clientUrl);

  return [...origins];
}

function getServerPublicUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

module.exports = {
  getAllowedOrigins,
  getClientUrl,
  getServerPublicUrl,
};

