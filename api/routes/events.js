// Events routes.
// GET  : list events (home + search) and one event (details).
// POST/PUT/DELETE : full CRUD for the admin site.
// GET /:id/registrations : the registrations of one event, newest first.
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

// Summary fields used by the home page and the search results.
// Event status is derived from the date so it can never go stale.
const EVENT_LIST_SELECT = `
  SELECT e.event_id, e.event_name, e.summary, e.event_date, e.start_time, e.end_time,
         e.venue, e.city, e.ticket_price, e.image_url, e.is_suspended,
         c.category_id, c.category_name,
         o.org_id, o.org_name,
         CASE WHEN e.event_date < CURDATE() THEN 'past' ELSE 'upcoming' END AS event_status
  FROM events e
  JOIN categories    c ON c.category_id = e.category_id
  JOIN organisations o ON o.org_id      = e.org_id
`;

// List events.
// Optional query parameters are date, date from, date to, city, category id, status, and limit.
router.get('/', async (req, res, next) => {
  try {
    const { date, dateFrom, dateTo, city, categoryId, status, limit, includeSuspended } = req.query;
    const conditions = [];
    const params = [];

    // Suspended events are hidden from the public site by default.
    // The admin site passes includeSuspended=1 so staff can see everything.
    if (String(includeSuspended || '') !== '1') {
      conditions.push('e.is_suspended = 0');
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date must use the format YYYY-MM-DD' });
      }
      conditions.push('e.event_date = ?');
      params.push(date);
    }
    if (dateFrom) { conditions.push('e.event_date >= ?'); params.push(dateFrom); }
    if (dateTo)   { conditions.push('e.event_date <= ?'); params.push(dateTo); }

    if (city) { conditions.push('e.city = ?'); params.push(city); }

    if (categoryId !== undefined) {
      if (!/^\d+$/.test(categoryId)) {
        return res.status(400).json({ error: 'categoryId must be a number' });
      }
      conditions.push('e.category_id = ?');
      params.push(Number(categoryId));
    }

    if (status) {
      if (!['upcoming', 'past'].includes(status)) {
        return res.status(400).json({ error: "status must be 'upcoming' or 'past'" });
      }
      conditions.push(status === 'upcoming'
        ? 'e.event_date >= CURDATE()'
        : 'e.event_date <  CURDATE()');
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    let sql = EVENT_LIST_SELECT + where + ' ORDER BY e.event_date ASC';

    // Optional row limit so one request can never return an unbounded result set.
    if (limit !== undefined) {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return res.status(400).json({ error: 'limit must be an integer between 1 and 100' });
      }
      sql += ' LIMIT ?';
      params.push(n);
    }

    const db = await getConnection();
    const [rows] = await db.query(sql, params);
    res.json({ count: rows.length, events: rows });
  } catch (err) {
    next(err);
  }
});

// Registrations for one event.
// The list is ordered newest first in SQL so every client shows the same order.
// Placed before GET /:id so the two-segment path is never shadowed.
router.get('/:id/registrations', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Event id must be a positive integer' });
    }

    const db = await getConnection();

    // Distinguish "event does not exist" from "event has no registrations".
    const [found] = await db.query('SELECT event_id FROM events WHERE event_id = ?', [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: `Event ${id} not found` });
    }

    const [rows] = await db.query(
      `SELECT registration_id, event_id, user_name, user_email,
              contact_phone, tickets, registration_date
       FROM registrations
       WHERE event_id = ?
       ORDER BY registration_date DESC, registration_id DESC`,
      [id]
    );
    res.json({ count: rows.length, registrations: rows });
  } catch (err) {
    next(err);
  }
});

// Return one event by identifier.
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Event id must be a positive integer' });
    }
    const db = await getConnection();
    // includeSuspended=1 lets the admin open an event that is hidden from the
    // public site (needed by the edit form).
    const includeSuspended = String(req.query.includeSuspended || '') === '1';
    const [rows] = await db.query(
      `SELECT e.*,
              c.category_name,
              o.org_name, o.mission, o.email, o.phone, o.website,
              CASE WHEN e.event_date < CURDATE() THEN 'past' ELSE 'upcoming' END AS event_status,
              ROUND(e.raised_amount / NULLIF(e.goal_amount, 0) * 100, 1)      AS progress_percent
       FROM events e
       JOIN categories    c ON c.category_id = e.category_id
       JOIN organisations o ON o.org_id      = e.org_id
       WHERE e.event_id = ? ${includeSuspended ? '' : 'AND e.is_suspended = 0'}`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Event ${id} not found` });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create a new event.
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    const name = String(body.event_name || '').trim();
    if (name.length < 3 || name.length > 150) {
      errors.push('event_name must be between 3 and 150 characters');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.event_date || ''))) {
      errors.push('event_date must use the format YYYY-MM-DD');
    }

    const categoryId = Number(body.category_id);
    const orgId = Number(body.org_id);
    if (!Number.isInteger(categoryId) || categoryId < 1) errors.push('category_id must be a positive integer');
    if (!Number.isInteger(orgId) || orgId < 1) errors.push('org_id must be a positive integer');

    const ticketPrice = body.ticket_price === undefined || body.ticket_price === '' ? 0 : Number(body.ticket_price);
    const goalAmount  = body.goal_amount  === undefined || body.goal_amount  === '' ? 0 : Number(body.goal_amount);
    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) errors.push('ticket_price must be zero or greater');
    if (!Number.isFinite(goalAmount)  || goalAmount  < 0) errors.push('goal_amount must be zero or greater');

    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const db = await getConnection();

    // Validate the foreign keys first so an invalid id is a 400, not a 500.
    const [cats] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [categoryId]);
    if (cats.length === 0) {
      return res.status(400).json({ error: `category_id ${categoryId} does not exist` });
    }
    const [orgs] = await db.query('SELECT org_id FROM organisations WHERE org_id = ?', [orgId]);
    if (orgs.length === 0) {
      return res.status(400).json({ error: `org_id ${orgId} does not exist` });
    }

    const toNullableNumber = (value) =>
      (value === undefined || value === null || value === '') ? null : Number(value);

    const [result] = await db.query(
      `INSERT INTO events
         (event_name, summary, description, purpose, event_date, start_time, end_time,
          venue, address, city, ticket_price, goal_amount, raised_amount, image_url,
          org_id, category_id, latitude, longitude)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        body.summary ? String(body.summary).trim() : null,
        body.description ? String(body.description).trim() : null,
        body.purpose ? String(body.purpose).trim() : null,
        body.event_date,
        body.start_time || null,
        body.end_time || null,
        body.venue ? String(body.venue).trim() : null,
        body.address ? String(body.address).trim() : null,
        body.city ? String(body.city).trim() : null,
        ticketPrice,
        goalAmount,
        body.raised_amount === undefined || body.raised_amount === '' ? 0 : Number(body.raised_amount),
        body.image_url ? String(body.image_url).trim() : null,
        orgId,
        categoryId,
        toNullableNumber(body.latitude),
        toNullableNumber(body.longitude)
      ]
    );

    const [rows] = await db.query('SELECT * FROM events WHERE event_id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update an existing event. Only the fields that were sent are changed.
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Event id must be a positive integer' });
    }

    const db = await getConnection();
    const [found] = await db.query('SELECT event_id FROM events WHERE event_id = ?', [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: `Event ${id} not found` });
    }

    const body = req.body || {};
    const allowed = ['event_name', 'summary', 'description', 'purpose', 'event_date',
                     'start_time', 'end_time', 'venue', 'address', 'city',
                     'ticket_price', 'goal_amount', 'raised_amount', 'image_url',
                     'org_id', 'category_id', 'latitude', 'longitude', 'is_suspended'];

    const sets = [];
    const params = [];
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        sets.push('`' + field + '` = ?');
        params.push(body[field] === '' ? null : body[field]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields were supplied' });
    }

    // Validate the foreign keys when they are part of the update.
    if (Object.prototype.hasOwnProperty.call(body, 'category_id')) {
      const [c] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [body.category_id]);
      if (c.length === 0) {
        return res.status(400).json({ error: `category_id ${body.category_id} does not exist` });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'org_id')) {
      const [o] = await db.query('SELECT org_id FROM organisations WHERE org_id = ?', [body.org_id]);
      if (o.length === 0) {
        return res.status(400).json({ error: `org_id ${body.org_id} does not exist` });
      }
    }

    params.push(id);
    await db.query('UPDATE events SET ' + sets.join(', ') + ' WHERE event_id = ?', params);

    const [rows] = await db.query('SELECT * FROM events WHERE event_id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Delete an event.
// Data integrity rule: an event that already has registrations cannot be deleted.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Event id must be a positive integer' });
    }

    const db = await getConnection();

    const [found] = await db.query('SELECT event_id FROM events WHERE event_id = ?', [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: `Event ${id} not found` });
    }

    // Count the registrations before deleting anything.
    const [counts] = await db.query(
      'SELECT COUNT(*) AS total FROM registrations WHERE event_id = ?',
      [id]
    );
    if (counts[0].total > 0) {
      return res.status(409).json({
        error: `Event ${id} cannot be deleted because it has ${counts[0].total} registration(s).`
      });
    }

    await db.query('DELETE FROM events WHERE event_id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
