const express = require('express');
const bcryptjs = require('bcryptjs');
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
  } catch (_error) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  return next();
};

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS evaluaciones_investigador (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      usuario_nombre VARCHAR(120),
      puntaje INTEGER NOT NULL DEFAULT 0,
      expected_total INTEGER NOT NULL DEFAULT 0,
      user_total INTEGER NOT NULL DEFAULT 0,
      correct_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
      incorrect_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
      missing_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
      resuelto BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE evaluaciones_investigador
    ADD COLUMN IF NOT EXISTS resuelto BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE evaluaciones_investigador
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS evaluacion_justificaciones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      evaluacion_id UUID NOT NULL REFERENCES evaluaciones_investigador(id) ON DELETE CASCADE,
      pair_key TEXT NOT NULL,
      pair_label TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (evaluacion_id, pair_key)
    )
  `);
};

const investigatorFields = `
  u.id,
  u.nombre,
  u.email,
  u.activo,
  u.primera_vez,
  u.created_at,
  u.updated_at,
  r.nombre AS rol,
  COALESCE(ei.resuelto, false) AS feedback_resuelto,
  ei.id AS feedback_id,
  ei.puntaje AS feedback_puntaje,
  ei.expected_total AS feedback_expected_total,
  ei.user_total AS feedback_user_total,
  ei.created_at AS feedback_created_at,
  ei.updated_at AS feedback_updated_at
`;

router.get('/investigadores', authenticate, requireAdmin, async (_req, res) => {
  try {
    await ensureSchema();

    const result = await pool.query(
      `
      SELECT ${investigatorFields}
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      LEFT JOIN evaluaciones_investigador ei ON ei.usuario_id = u.id
      ORDER BY u.created_at DESC
      `
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Error listando investigadores:', error);
    return res.status(500).json({ error: 'No fue posible listar investigadores' });
  }
});

router.patch('/investigadores/:id/reset-first-login', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete evaluations feedback data
    await pool.query(
      'DELETE FROM evaluaciones_investigador WHERE usuario_id = $1',
      [id]
    );

    // 2. Delete connections created by user (for the 3D graph)
    await pool.query(
      'DELETE FROM conexiones WHERE created_by = $1',
      [id]
    );

    // 3. Delete association groups created by user (which cascades to cases, relations and exclusions)
    await pool.query(
      'DELETE FROM grupos_asociacion WHERE created_by = $1',
      [id]
    );

    // 4. Reset user flags: primera_vez = true, elapsed_seconds = 0, and empty created_groups json string
    const result = await pool.query(
      "UPDATE usuarios SET primera_vez = TRUE, elapsed_seconds = 0, created_groups = '[]' WHERE id = $1 RETURNING id, nombre, email, primera_vez",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ success: true, message: 'Inducción reiniciada y progreso del usuario completamente reseteado a cero.', usuario: result.rows[0] });
  } catch (error) {
    console.error('Error reseteando primer ingreso:', error);
    return res.status(500).json({ error: 'No fue posible resetear el primer ingreso' });
  }
});

router.post('/investigadores', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();

    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const roleResult = await pool.query('SELECT id FROM roles WHERE nombre = $1', ['investigador']);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: 'Rol investigador no existe' });
    }

    const hashedPassword = await bcryptjs.hash(String(password), 10);
    const result = await pool.query(
      `
      INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, nombre, email, activo, created_at
      `,
      [nombre, email, hashedPassword, roleResult.rows[0].id]
    );

    return res.status(201).json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Error creando investigador:', error);
    return res.status(500).json({ error: 'No fue posible crear el investigador' });
  }
});

router.patch('/investigadores/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: 'La nueva contraseña es requerida' });
    }

    const hashedPassword = await bcryptjs.hash(String(password), 10);
    const result = await pool.query(
      'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nombre, email',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Investigador no encontrado' });
    }

    return res.json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando contrasena de investigador:', error);
    return res.status(500).json({ error: 'No fue posible actualizar la contrasena' });
  }
});

router.patch('/investigadores/:id/resuelto', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();

    const { id } = req.params;
    const { resuelto } = req.body || {};

    const result = await pool.query(
      `
      UPDATE evaluaciones_investigador
      SET resuelto = $1, updated_at = CURRENT_TIMESTAMP
      WHERE usuario_id = $2
      RETURNING *
      `,
      [Boolean(resuelto), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay evaluacion registrada para este investigador' });
    }

    return res.json({ feedback: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando estado resuelto del investigador:', error);
    return res.status(500).json({ error: 'No fue posible actualizar el estado de resuelto' });
  }
});

router.patch('/investigadores/:id/reactivar', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Delete evaluations feedback data
    await pool.query(
      'DELETE FROM evaluaciones_investigador WHERE usuario_id = $1',
      [id]
    );

    // 2. Delete connections created by user (for the 3D graph)
    await pool.query(
      'DELETE FROM conexiones WHERE created_by = $1',
      [id]
    );

    // 3. Delete association groups created by user (which cascades to cases, relations and exclusions)
    await pool.query(
      'DELETE FROM grupos_asociacion WHERE created_by = $1',
      [id]
    );

    // 4. Reset user flags: primera_vez = true, elapsed_seconds = 0, and empty created_groups json string
    await pool.query(
      "UPDATE usuarios SET primera_vez = true, elapsed_seconds = 0, created_groups = '[]' WHERE id = $1",
      [id]
    );

    return res.json({ success: true, message: 'Investigación y progreso del usuario reseteados exitosamente. Listo para nueva inducción.' });
  } catch (error) {
    console.error('Error reactivando investigación:', error);
    return res.status(500).json({ error: 'No fue posible reactivar la investigación' });
  }
});

module.exports = router;
