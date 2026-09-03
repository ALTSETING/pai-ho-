'use strict';

function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    const isLocal = isHttp && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const isVercel = url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
    return isLocal || isVercel;
  } catch {
    return false;
  }
}

function checkOrigin(origin, callback) {
  callback(null, isAllowedOrigin(origin));
}

const corsOptions = {
  origin: checkOrigin,
  credentials: false,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = { isAllowedOrigin, corsOptions };
