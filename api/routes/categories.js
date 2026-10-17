// Categories routes.
// Return all event categories to populate the search page filter. Include an active event count for each category.
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getConnection();
    const [rows] = await db.query(
      `SELECT c.category_id, c.category_name, c.description,
              COUNT(e.event_id) AS event_count
       FROM categories c
       LEFT JOIN events e
              ON e.category_id = c.category_id
             AND e.is_suspended = 0
       GROUP BY c.category_id, c.category_name, c.description
       ORDER BY c.category_name ASC`
    );
    res.json({ count: rows.length, categories: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
