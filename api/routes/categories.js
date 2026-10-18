// Categories routes.
// GET    : list categories with a count of the active events that use them.
// POST   : create a category (the name is unique).
// PUT    : update a category.
// DELETE : remove a category, but only when no event uses it (data integrity).
const express = require('express');
const { getConnection } = require('../event_db');

const router = express.Router();

// List categories, each with the number of active events that use it.
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

// Create a category.
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.category_name || '').trim();
    const description = body.description ? String(body.description).trim() : null;

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ error: 'category_name must be between 2 and 60 characters' });
    }
    if (description && description.length > 255) {
      return res.status(400).json({ error: 'description must be 255 characters or fewer' });
    }

    const db = await getConnection();

    try {
      const [result] = await db.query(
        'INSERT INTO categories (category_name, description) VALUES (?, ?)',
        [name, description]
      );
      const [rows] = await db.query('SELECT * FROM categories WHERE category_id = ?', [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      // 1062 = duplicate entry: the category_name column is UNIQUE.
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: `A category named "${name}" already exists.` });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// Update a category. Only the fields that were sent are changed.
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Category id must be a positive integer' });
    }

    const db = await getConnection();
    const [found] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: `Category ${id} not found` });
    }

    const body = req.body || {};
    const sets = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(body, 'category_name')) {
      const name = String(body.category_name || '').trim();
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ error: 'category_name must be between 2 and 60 characters' });
      }
      sets.push('category_name = ?');
      params.push(name);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      sets.push('description = ?');
      params.push(body.description === null || body.description === ''
        ? null
        : String(body.description).trim());
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields were supplied' });
    }

    try {
      params.push(id);
      await db.query('UPDATE categories SET ' + sets.join(', ') + ' WHERE category_id = ?', params);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'A category with that name already exists.' });
      }
      throw err;
    }

    const [rows] = await db.query('SELECT * FROM categories WHERE category_id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Delete a category.
// A category still used by an event cannot be deleted: the foreign key would
// refuse it, so this check turns that into a clear 409 instead of a 500.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Category id must be a positive integer' });
    }

    const db = await getConnection();

    const [found] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [id]);
    if (found.length === 0) {
      return res.status(404).json({ error: `Category ${id} not found` });
    }

    // Count every event, suspended ones included: the foreign key does not care
    // whether an event is visible on the public site.
    const [counts] = await db.query(
      'SELECT COUNT(*) AS total FROM events WHERE category_id = ?',
      [id]
    );
    if (counts[0].total > 0) {
      return res.status(409).json({
        error: `Category ${id} cannot be deleted because ${counts[0].total} event(s) use it.`
      });
    }

    await db.query('DELETE FROM categories WHERE category_id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
