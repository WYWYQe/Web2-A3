// API server.
// Express application that serves the charity events REST API.
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./event_db');

const eventsRouter        = require('./routes/events');
const categoriesRouter    = require('./routes/categories');
const locationsRouter     = require('./routes/locations');
const registrationsRouter = require('./routes/registrations');
const organisationsRouter = require('./routes/organisations');

const app  = express();
const PORT = process.env.PORT || 3000;

// Allow the client side website served from a different port to call this API.
app.use(cors());
app.use(express.json());   // Parse JSON request bodies.

// Log every request so it is visible in the terminal while the API runs.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// Resource routes.
//
// The routers are mounted twice on purpose: once under /api (the URL both
// front-ends call) and once at the root. Shared hosts differ in whether they
// pass the request path through unchanged or strip the mount prefix before the
// app sees it, so registering both makes the endpoints answer either way.
['/api', ''].forEach((prefix) => {
  app.use(prefix + '/events',        eventsRouter);
  app.use(prefix + '/categories',    categoriesRouter);
  app.use(prefix + '/locations',     locationsRouter);
  app.use(prefix + '/registrations', registrationsRouter);
  app.use(prefix + '/organisations', organisationsRouter);
});

// Anything under /api that no router matched is a 404, not an HTML error page.
['/api', ''].forEach((prefix) => {
  app.use(prefix, (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
});

// Central error handler. Log the real error. Never send the stack to the client.
// Body-parser errors (malformed JSON) and other client mistakes carry their own
// status, so honour it instead of reporting every failure as 500.
app.use((err, req, res, next) => {
  console.error('[API error]', err);
  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message || 'Bad request' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Charity Events API listening on http://localhost:${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('Database check failed:', err.message);
  }
});

module.exports = app;
