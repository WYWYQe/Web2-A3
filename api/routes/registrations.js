// Registrations routes.
// Create a registration and read registrations of one event.
// One user may register for many events, but only once per event
// (enforced by the UNIQUE key on the registrations table).
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

const MAX_TICKETS = 20;

// POST /api/registrations
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    const eventId = Number(body.event_id);
    if (!Number.isInteger(eventId) || eventId < 1) {
      errors.push('event_id must be a positive integer');
    }

    const userName = String(body.user_name || '').trim();
    if (userName.length < 2 || userName.length > 100) {
      errors.push('user_name must be between 2 and 100 characters');
    }

    const userEmail = String(body.user_email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      errors.push('user_email must be a valid email address');
    }

    let contactPhone = null;
    if (body.contact_phone !== undefined && body.contact_phone !== null &&
        String(body.contact_phone).trim() !== '') {
      contactPhone = String(body.contact_phone).trim();
      if (!/^[\d\s()+-]{6,30}$/.test(contactPhone)) {
        errors.push('contact_phone contains invalid characters');
      }
    }

    const tickets = Number(body.tickets);
    if (!Number.isInteger(tickets) || tickets < 1 || tickets > MAX_TICKETS) {
      errors.push(`tickets must be an integer between 1 and ${MAX_TICKETS}`);
    }

    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const db = await getConnection();

    // The event must exist and must not be suspended.
    const [events] = await db.query(
      'SELECT event_id, event_date, (event_date < CURDATE()) AS is_past ' +
      'FROM events WHERE event_id = ? AND is_suspended = 0',
      [eventId]
    );
    if (events.length === 0) {
      return res.status(404).json({ error: `Event ${eventId} not found` });
    }

    // Registration closes once the event date has passed. This uses the same
    // CURDATE() test as the event list, so "past" means the same thing here.
    if (Number(events[0].is_past) === 1) {
      return res.status(409).json({
        error: `Event ${eventId} took place on ${events[0].event_date}, so registration is closed.`
      });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO registrations
           (event_id, user_name, user_email, contact_phone, tickets)
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, userName, userEmail, contactPhone, tickets]
      );
      return res.status(201).json({
        message: 'Registration created',
        registration_id: result.insertId,
        tickets
      });
    } catch (err) {
      // 1062 = duplicate entry: this email already registered for this event.
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'This email has already registered for this event.' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/registrations  (used by the admin site for totals and overview)
router.get('/', async (req, res, next) => {
  try {
    const db = await getConnection();
    const [rows] = await db.query(
      `SELECT r.registration_id, r.event_id, e.event_name, r.user_name, r.user_email,
              r.contact_phone, r.tickets, r.registration_date
       FROM registrations r
       JOIN events e ON e.event_id = r.event_id
       ORDER BY r.registration_date DESC, r.registration_id DESC`
    );
    res.json({ count: rows.length, registrations: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
