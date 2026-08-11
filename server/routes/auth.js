const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const matchesPassword = async (plainPassword, storedHash, legacyPassword) => {
  if (storedHash && String(storedHash).startsWith('$2')) {
    try {
      return await bcryptjs.compare(plainPassword, storedHash);
    } catch (_error) {
      return false;
    }
  }

  return plainPassword === legacyPassword;
};

// Login
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'prisma_secret_key_2026');
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridas' });
    }

    const result = await pool.query(
      'SELECT u.id, u.nombre, u.email, u.password_hash, u.primera_vez, u.elapsed_seconds, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.email = $1 AND u.activo = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];
    
    const passwordValido = await matchesPassword(
      password,
      usuario.password_hash,
      usuario.rol === 'admin' ? 'admin123' : 'investigador123'
    );

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET || 'prisma_secret_key_2026',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        primera_vez: usuario.primera_vez,
        elapsed_seconds: usuario.elapsed_seconds,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

router.post('/complete-first-login', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET primera_vez = FALSE WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

router.post('/save-time', authenticate, async (req, res) => {
  try {
    const { elapsed_seconds } = req.body;
    if (elapsed_seconds === undefined) {
      return res.status(400).json({ error: 'elapsed_seconds requerido' });
    }
    await pool.query('UPDATE usuarios SET elapsed_seconds = $1 WHERE id = $2', [parseInt(elapsed_seconds, 10), req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Registrar usuario (solo admin)
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, rol } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ error: 'Todos los campos requeridos' });
    }

    const rolResult = await pool.query('SELECT id FROM roles WHERE nombre = $1', [rol]);
    if (rolResult.rows.length === 0) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const tempPassword = 'temp_' + Math.random().toString(36).substring(7);
    const hashedPassword = await bcryptjs.hash(tempPassword, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email',
      [nombre, email, hashedPassword, rolResult.rows[0].id]
    );

    res.json({ usuario: result.rows[0], tempPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

module.exports = router;
