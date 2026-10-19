// The only place that knows where the API lives.
//
// Local development : the Express API runs separately on port 3000.
// Deployed build    : the API is served from the same origin under /api,
//                     so a relative path works and no CORS is involved.
//
// When you deploy, check this file first: it is the usual cause of
// "the page loads but nothing shows up".

const isLocalHost =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export const API_BASE = isLocalHost ? 'http://localhost:3000/api' : '/api';
