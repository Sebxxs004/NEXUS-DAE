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
    return res.status(401).json({ error: 'Token invalido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  return next();
};

const ensureConfigTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracion_sistema (
      id SERIAL PRIMARY KEY,
      tiempo_limite_minutos INTEGER NOT NULL DEFAULT 120,
      alerta_minutos_agregados INTEGER DEFAULT 0,
      alerta_version INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS alerta_minutos_agregados INTEGER DEFAULT 0;
    ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS alerta_version INTEGER DEFAULT 0;
  `);
  
  const result = await pool.query('SELECT count(*) FROM configuracion_sistema');
  if (parseInt(result.rows[0].count) === 0) {
    await pool.query('INSERT INTO configuracion_sistema (tiempo_limite_minutos) VALUES (120)');
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    await ensureConfigTable();
    const result = await pool.query('SELECT tiempo_limite_minutos, alerta_minutos_agregados, alerta_version FROM configuracion_sistema LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Error obteniendo configuracion' });
  }
});

router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensureConfigTable();
    const { tiempo_limite_minutos } = req.body;
    
    if (tiempo_limite_minutos === undefined || tiempo_limite_minutos < 1) {
      return res.status(400).json({ error: 'Tiempo límite inválido, el mínimo es 1 minuto' });
    }

    const result = await pool.query(
      'UPDATE configuracion_sistema SET tiempo_limite_minutos = $1, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [tiempo_limite_minutos]
    );

    // Sincronizar y reiniciar también el contador de todos los equipos y usuarios con el nuevo tiempo configurado por el Admin
    const nuevaDuracionSegundos = Number(tiempo_limite_minutos) * 60;
    await pool.query(
      `UPDATE equipos 
       SET duracion_segundos = $1, 
           started_at_epoch = $2, 
           started_at = NOW(), 
           accumulated_penalty_seconds = 0, 
           last_penalty = NULL`,
      [nuevaDuracionSegundos, Date.now()]
    ).catch((e) => console.warn('Aviso sincronizando equipos en PUT /configuracion:', e.message));

    await pool.query('UPDATE usuarios SET elapsed_seconds = 0').catch(() => {});

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Error actualizando configuracion' });
  }
});

router.post('/add-minutes', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensureConfigTable();
    const { minutos } = req.body;
    if (minutos === undefined || minutos <= 0) {
      return res.status(400).json({ error: 'Cantidad de minutos inválida' });
    }

    const result = await pool.query(
      `UPDATE configuracion_sistema 
       SET tiempo_limite_minutos = tiempo_limite_minutos + $1, 
           alerta_minutos_agregados = $1, 
           alerta_version = alerta_version + 1, 
           updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [minutos]
    );

    const segundosExtra = Number(minutos) * 60;
    await pool.query(
      'UPDATE equipos SET duracion_segundos = COALESCE(duracion_segundos, 7200) + $1',
      [segundosExtra]
    ).catch((e) => console.warn('Aviso agregando minutos a equipos:', e.message));

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding minutes:', error);
    res.status(500).json({ error: 'Error agregando minutos' });
  }
});

module.exports = router;
