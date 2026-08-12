const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prisma_secret_key_2026';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido' });
  }
  return next();
};

// GET / - List all events
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eventos_despacho ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando eventos:', error);
    res.status(500).json({ error: 'No fue posible listar los eventos.' });
  }
});

// POST / - Create a new event (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { nombre, imagen_url } = req.body || {};
    if (!nombre || !imagen_url) {
      return res.status(400).json({ error: 'El nombre y la imagen son requeridos.' });
    }

    const result = await pool.query(
      'INSERT INTO eventos_despacho (nombre, imagen_url) VALUES ($1, $2) RETURNING *',
      [nombre, imagen_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ error: 'No fue posible crear el evento.' });
  }
});

// DELETE /:id - Delete an event (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM eventos_despacho WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }
    res.json({ message: 'Evento eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ error: 'No fue posible eliminar el evento.' });
  }
});

module.exports = router;
