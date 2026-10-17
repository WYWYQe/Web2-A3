// Locations routes.
// Return distinct cities that currently have active events.
// Used to populate the location dropdown on the search page.
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getConnection();
    const [rows] = await db.query(
      `SELECT DISTINCT city
       FROM events
       WHERE is_suspended = 0 AND city IS NOT NULL AND city <> ''
       ORDER BY city ASC`
    );
    res.json({ count: rows.length, locations: rows.map(r => r.city) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
