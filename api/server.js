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
app.use('/api/events',        eventsRouter);
app.use('/api/categories',    categoriesRouter);
app.use('/api/locations',     locationsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/organisations', organisationsRouter);

// Not found response for any other API path.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler. Log the real error. Never send the stack to the client.
app.use((err, req, res, next) => {
  console.error('[API error]', err);
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
