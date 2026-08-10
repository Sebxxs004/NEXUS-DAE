const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware simple consistente con el resto de rutas
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  next();
};

router.get('/', verificarToken, async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id,
        c.carpeta_origen_id,
        c.carpeta_destino_id,
        c.tipo,
        c.razonamiento,
        c.created_at,
        co.nombre AS caso_origen,
        cd.nombre AS caso_destino,
        co.modalidad AS modalidad_origen,
        cd.modalidad AS modalidad_destino,
        co.patrones AS patrones_origen,
        cd.patrones AS patrones_destino
      FROM conexiones c
      JOIN carpetas co ON c.carpeta_origen_id = co.id
      JOIN carpetas cd ON c.carpeta_destino_id = cd.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo conexiones:', error);
    res.status(500).json({ error: 'Error obteniendo conexiones' });
  }
});

router.get('/carpeta/:carpeta_id', verificarToken, async (req, res) => {
  try {
    const { carpeta_id } = req.params;
    const result = await db.query(
      `
      SELECT
        c.id,
        c.carpeta_origen_id,
        c.carpeta_destino_id,
        c.tipo,
        c.razonamiento,
        c.created_at,
        co.nombre AS caso_origen,
        cd.nombre AS caso_destino,
        co.modalidad AS modalidad_origen,
        cd.modalidad AS modalidad_destino,
        co.patrones AS patrones_origen,
        cd.patrones AS patrones_destino
      FROM conexiones c
      JOIN carpetas co ON c.carpeta_origen_id = co.id
      JOIN carpetas cd ON c.carpeta_destino_id = cd.id
      WHERE c.carpeta_origen_id = $1 OR c.carpeta_destino_id = $1
      ORDER BY c.created_at DESC
      `,
      [carpeta_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo conexiones del caso:', error);
    res.status(500).json({ error: 'Error obteniendo conexiones' });
  }
});

module.exports = router;
