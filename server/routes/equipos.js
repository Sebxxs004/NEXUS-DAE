const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prisma_secret_key_2026';

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  return next();
};

// Asegurar existencia de tablas para Equipos, Alertas Delegadas y Rol Asistente
const ensureTeamsSchema = async () => {
  try {
    // 1. Rol asistente
    await pool.query(`
      INSERT INTO roles (nombre, descripcion)
      VALUES ('asistente', 'Asistente de Fiscal - apoyo operativo y recepción de actuaciones')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 2. Tabla de equipos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre VARCHAR(100) NOT NULL,
        codigo VARCHAR(50) UNIQUE,
        duracion_segundos INTEGER DEFAULT 7200,
        started_at TIMESTAMP,
        started_at_epoch BIGINT,
        accumulated_penalty_seconds INTEGER DEFAULT 0,
        last_penalty JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS started_at_epoch BIGINT;
    `);

    // 3. Columna equipo_id en usuarios
    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;
    `);

    // 4. Tabla de alertas delegadas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alertas_delegadas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
        evento_id UUID,
        titulo VARCHAR(255) NOT NULL,
        subtitulo VARCHAR(255),
        dialogo TEXT,
        delito VARCHAR(150),
        radicado VARCHAR(100),
        caso_nombre VARCHAR(255),
        delegado_por VARCHAR(150),
        opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
        estado VARCHAR(50) DEFAULT 'PENDIENTE',
        opcion_seleccionada TEXT,
        justificacion TEXT,
        resuelto_por VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('[SCHEMA TEAMS] Error asegurando tablas de equipos:', err.message);
  }
};

// Ejecutar schema check
ensureTeamsSchema();

// GET /api/equipos - Listar todos los equipos con sus integrantes
router.get('/', authenticate, async (req, res) => {
  try {
    await ensureTeamsSchema();
    const equiposRes = await pool.query('SELECT * FROM equipos ORDER BY created_at ASC');
    const usuariosRes = await pool.query(`
      SELECT u.id, u.nombre, u.email, u.activo, u.equipo_id, r.nombre as rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.equipo_id IS NOT NULL
      ORDER BY u.nombre ASC
    `);

    const usuariosPorEquipo = {};
    usuariosRes.rows.forEach(u => {
      if (!usuariosPorEquipo[u.equipo_id]) {
        usuariosPorEquipo[u.equipo_id] = [];
      }
      usuariosPorEquipo[u.equipo_id].push({
        id: u.id,
        nombreCompleto: u.nombre,
        email: u.email,
        rol: u.rol === 'investigador' ? 'FISCAL' : (u.rol === 'asistente' ? 'ASISTENTE' : u.rol.toUpperCase()),
        activo: u.activo
      });
    });

    const result = equiposRes.rows.map(eq => ({
      id: eq.id,
      nombre: eq.nombre,
      codigo: eq.codigo,
      duracion_segundos: eq.duracion_segundos || 7200,
      integrantes: usuariosPorEquipo[eq.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error('Error listando equipos:', err);
    res.status(500).json({ error: 'No fue posible listar los equipos' });
  }
});

// POST /api/equipos - Crear equipo (Admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { nombre, codigo } = req.body || {};
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
    }

    const cod = (codigo && codigo.trim()) ? codigo.trim() : `EQ-${Date.now().toString().slice(-4)}`;
    const result = await pool.query(
      'INSERT INTO equipos (nombre, codigo) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), cod]
    );

    res.status(201).json({
      id: result.rows[0].id,
      nombre: result.rows[0].nombre,
      codigo: result.rows[0].codigo,
      integrantes: []
    });
  } catch (err) {
    console.error('Error creando equipo:', err);
    res.status(500).json({ error: 'Error al crear equipo' });
  }
});

// DELETE /api/equipos/:id - Eliminar equipo (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuarios SET equipo_id = NULL WHERE equipo_id = $1', [id]);
    await pool.query('DELETE FROM equipos WHERE id = $1', [id]);
    res.json({ message: 'Equipo eliminado exitosamente' });
  } catch (err) {
    console.error('Error eliminando equipo:', err);
    res.status(500).json({ error: 'Error al eliminar equipo' });
  }
});

// POST /api/equipos/:id/usuarios - Asignar usuario a un equipo (Admin)
router.post('/:id/usuarios', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId, email, nombre, password, rol } = req.body || {};

    let targetUserId = usuarioId;

    // Si viene para crear un usuario directamente en el equipo
    if (!targetUserId && email) {
      const rolName = (rol && rol.toUpperCase() === 'ASISTENTE') ? 'asistente' : 'investigador';
      const rolRes = await pool.query('SELECT id FROM roles WHERE nombre = $1', [rolName]);
      const rolId = rolRes.rows[0]?.id || 2;
      const bcryptjs = require('bcryptjs');
      const hash = await bcryptjs.hash(password || '1234', 10);

      const nuevoUser = await pool.query(
        'INSERT INTO usuarios (nombre, email, password_hash, rol_id, equipo_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [nombre || email.split('@')[0], email, hash, rolId, id]
      );
      targetUserId = nuevoUser.rows[0].id;
    } else if (targetUserId) {
      await pool.query('UPDATE usuarios SET equipo_id = $1 WHERE id = $2', [id, targetUserId]);
    }

    res.json({ message: 'Usuario asignado al equipo exitosamente', usuarioId: targetUserId });
  } catch (err) {
    console.error('Error asignando usuario a equipo:', err);
    res.status(500).json({ error: 'Error al asignar usuario al equipo' });
  }
});

// DELETE /api/equipos/:id/usuarios/:usuarioId - Remover usuario de un equipo (Admin)
router.delete('/:id/usuarios/:usuarioId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id, usuarioId } = req.params;
    await pool.query('UPDATE usuarios SET equipo_id = NULL WHERE id = $1 AND equipo_id = $2', [usuarioId, id]);
    res.json({ message: 'Usuario removido del equipo exitosamente' });
  } catch (err) {
    console.error('Error removiendo usuario:', err);
    res.status(500).json({ error: 'Error al remover usuario' });
  }
});

// ----------------------------------------------------
// TEMPORIZADOR COMPARTIDO POR EQUIPO (2 HORAS = 7200s)
// ----------------------------------------------------

router.get('/:id/timer', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    let eqRes = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
    
    // Si no existe (ej: "general" o id temporal), devolver configuración general de 2 horas
    if (eqRes.rows.length === 0) {
      return res.json({
        equipoId: id,
        durationSeconds: 7200,
        elapsedSeconds: 0,
        accumulatedPenaltySeconds: 0,
        timeLeftSeconds: 7200,
        time_left_seconds: 7200,
        isFinished: false,
        lastPenalty: null,
        started: false
      });
    }

    const eq = eqRes.rows[0];
    const totalDuration = eq.duracion_segundos || 7200;
    const startedAt = eq.started_at_epoch ? Number(eq.started_at_epoch) : null;

    if (!startedAt) {
      return res.json({
        equipoId: eq.id,
        durationSeconds: totalDuration,
        elapsedSeconds: 0,
        accumulatedPenaltySeconds: eq.accumulated_penalty_seconds || 0,
        timeLeftSeconds: Math.max(0, totalDuration - (eq.accumulated_penalty_seconds || 0)),
        time_left_seconds: Math.max(0, totalDuration - (eq.accumulated_penalty_seconds || 0)),
        isFinished: false,
        lastPenalty: eq.last_penalty,
        started: false
      });
    }

    const now = Date.now();
    let elapsedRealSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    let accumulatedPenaltySeconds = eq.accumulated_penalty_seconds || 0;
    let timeLeft = Math.max(0, totalDuration - elapsedRealSeconds - accumulatedPenaltySeconds);

    // Si el timer quedó en 0 por una sesión anterior expirada, reiniciarlo automáticamente al tiempo configurado (2 horas = 7200s)
    if (timeLeft <= 0) {
      await pool.query(
        `UPDATE equipos
         SET started_at_epoch = $1,
             started_at = NOW(),
             accumulated_penalty_seconds = 0,
             last_penalty = NULL
         WHERE id = $2`,
        [now, eq.id]
      );
      elapsedRealSeconds = 0;
      accumulatedPenaltySeconds = 0;
      timeLeft = totalDuration;
    }

    res.json({
      equipoId: eq.id,
      durationSeconds: totalDuration,
      elapsedSeconds: elapsedRealSeconds,
      accumulatedPenaltySeconds,
      timeLeftSeconds: timeLeft,
      time_left_seconds: timeLeft,
      isFinished: timeLeft <= 0,
      lastPenalty: eq.last_penalty,
      started: true
    });
  } catch (err) {
    console.error('Error consultando timer de equipo:', err);
    res.status(500).json({ error: 'Error obteniendo timer' });
  }
});

// POST /api/equipos/:id/timer/start - Iniciar el conteo regresivo compartido para el equipo
router.post('/:id/timer/start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { forceReset } = req.body || {};
    const eqRes = await pool.query(
      'SELECT started_at_epoch, duracion_segundos, accumulated_penalty_seconds FROM equipos WHERE id = $1',
      [id]
    );

    if (eqRes.rows.length > 0) {
      const eq = eqRes.rows[0];
      const totalDuration = eq.duracion_segundos || 7200;
      const startedAt = eq.started_at_epoch ? Number(eq.started_at_epoch) : null;
      const elapsedReal = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
      const timeLeft = startedAt
        ? Math.max(0, totalDuration - elapsedReal - (eq.accumulated_penalty_seconds || 0))
        : totalDuration;

      // Si nunca ha iniciado, o si la sesión anterior ya expiró (timeLeft <= 0), o si se fuerza reinicio:
      if (!startedAt || timeLeft <= 0 || forceReset) {
        let targetDuration = 7200;
        try {
          const cfg = await pool.query('SELECT tiempo_limite_minutos FROM configuracion_sistema LIMIT 1');
          if (cfg.rows.length > 0 && cfg.rows[0].tiempo_limite_minutos > 0) {
            targetDuration = Number(cfg.rows[0].tiempo_limite_minutos) * 60;
          }
        } catch (_e) {
          targetDuration = 7200;
        }

        await pool.query(
          `UPDATE equipos
           SET started_at_epoch = $1,
               started_at = NOW(),
               duracion_segundos = $2,
               accumulated_penalty_seconds = 0,
               last_penalty = NULL
           WHERE id = $3`,
          [Date.now(), targetDuration, id]
        );
        console.log(`[TIMER START] Timer del equipo ${id} (re)iniciado con ${targetDuration}s a las ${new Date().toISOString()}`);
      }
    }
    res.json({ success: true, started: true });
  } catch (err) {
    console.error('Error iniciando timer de equipo:', err);
    res.status(500).json({ error: 'Error iniciando timer de equipo' });
  }
});

router.post('/:id/timer/penalty', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes, reason, byUser } = req.body || {};
    const penaltyMinutes = Number(minutes) || 0;
    const penaltySeconds = penaltyMinutes * 60;

    const penaltyObject = {
      id: `pen-${Date.now()}`,
      minutes: penaltyMinutes,
      reason: reason || 'Ajuste de tiempo por decisión',
      byUser: byUser || req.user?.email || 'Integrante',
      timestamp: Date.now()
    };

    const updateRes = await pool.query(
      `UPDATE equipos
       SET accumulated_penalty_seconds = COALESCE(accumulated_penalty_seconds, 0) + $1,
           last_penalty = $2
       WHERE id = $3
       RETURNING *`,
      [penaltySeconds, JSON.stringify(penaltyObject), id]
    );

    if (updateRes.rows.length === 0) {
      return res.json({ success: true, lastPenalty: penaltyObject });
    }

    res.json({
      success: true,
      lastPenalty: penaltyObject,
      equipo: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error aplicando penalización:', err);
    res.status(500).json({ error: 'Error aplicando penalización' });
  }
});

// ----------------------------------------------------
// DELEGACIÓN DE ALERTAS (FISCAL -> ASISTENTE)
// ----------------------------------------------------

router.get('/:id/alertas', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM alertas_delegadas WHERE equipo_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando alertas delegadas:', err);
    res.status(500).json({ error: 'Error listando alertas delegadas' });
  }
});

router.post('/:id/alertas', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      subtitulo,
      dialogo,
      delito,
      radicado,
      casoNombre,
      delegadoPor,
      opciones
    } = req.body || {};

    const result = await pool.query(
      `INSERT INTO alertas_delegadas
       (equipo_id, titulo, subtitulo, dialogo, delito, radicado, caso_nombre, delegado_por, opciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        titulo || 'Actuación delegada por el Fiscal',
        subtitulo || 'Traslado de trámite de despacho',
        dialogo || '',
        delito || 'GENERAL',
        radicado || 'Sin radicado',
        casoNombre || null,
        delegadoPor || req.user?.email || 'Fiscal Delegado',
        JSON.stringify(opciones || [
          'Ignorar o descartar esta solicitud / actividad',
          'Proyectar minuta de respuesta formal y remitir al Fiscal',
          'Verificar folios y solicitar ampliación técnica a Policía Judicial'
        ])
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error delegando alerta:', err);
    res.status(500).json({ error: 'Error al delegar alerta' });
  }
});

router.post('/:id/alertas/:alertaId/resolver', authenticate, async (req, res) => {
  try {
    const { alertaId } = req.params;
    const { estado, opcionSeleccionada, justificacion, resueltoPor } = req.body || {};

    const result = await pool.query(
      `UPDATE alertas_delegadas
       SET estado = $1,
           opcion_seleccionada = $2,
           justificacion = $3,
           resuelto_por = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        estado || 'REALIZADA',
        opcionSeleccionada || '',
        justificacion || '',
        resueltoPor || req.user?.email || 'Asistente de Fiscal',
        alertaId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error resolviendo alerta delegada:', err);
    res.status(500).json({ error: 'Error al resolver alerta' });
  }
});

module.exports = router;
