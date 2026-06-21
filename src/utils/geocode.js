const axios = require('axios');
const mongoose = require('mongoose');

let lastRequestTime = 0;

const geocodeCache = new Map();

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

const geocode = async (addressString) => {
  const key = addressString.trim().toLowerCase();

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  await throttle();

  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: addressString, format: 'json', limit: 1 },
    headers: {
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'RealEstatePlatform/1.0',
    },
    timeout: 10000,
  });

  if (!response.data || response.data.length === 0) {
    return null;
  }

  const { lat, lon } = response.data[0];
  const result = { lat: parseFloat(lat), lng: parseFloat(lon) };

  geocodeCache.set(key, result);
  if (geocodeCache.size > 500) {
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }

  return result;
};

module.exports = geocode;
