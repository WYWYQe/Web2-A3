// Organisations routes.
// Return all organisations so the admin event form can populate its dropdown.
// The public site never displays organisations, only the admin site needs them.
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getConnection();
    const [rows] = await db.query(
      `SELECT org_id, org_name, mission, email, phone, website
       FROM organisations
       ORDER BY org_name ASC`
    );
    res.json({ count: rows.length, organisations: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
