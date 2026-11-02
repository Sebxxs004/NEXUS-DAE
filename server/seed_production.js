const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seedProduction() {
  try {
    console.log('[SEED] Iniciando siembra de datos de producción...');

    // 1. Roles
    await pool.query(`
      INSERT INTO roles (nombre, descripcion)
      VALUES 
        ('admin', 'Administrador del sistema con acceso total'),
        ('investigador', 'Fiscal Investigador delegado para asociar noticias criminales'),
        ('asistente', 'Asistente de Fiscal - apoyo operativo y recepción de actuaciones')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 2. Tablas base si no existen
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
      CREATE TABLE IF NOT EXISTS configuracion_sistema (
        id SERIAL PRIMARY KEY,
        tiempo_limite_minutos INTEGER DEFAULT 120,
        alerta_minutos_agregados INTEGER DEFAULT 0,
        alerta_version INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS started_at_epoch BIGINT;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;
      ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS alerta_minutos_agregados INTEGER DEFAULT 0;
      ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS alerta_version INTEGER DEFAULT 0;
    `);

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

    // 3. Configuración de 2 horas (120 minutos)
    await pool.query(`
      INSERT INTO configuracion_sistema (tiempo_limite_minutos)
      SELECT 120 WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema);
      UPDATE configuracion_sistema SET tiempo_limite_minutos = 120;
    `);

    // 4. Crear los 3 Equipos
    const equiposData = [
      { nombre: 'Equipo Alfa', codigo: 'EQ-ALFA' },
      { nombre: 'Equipo Bravo', codigo: 'EQ-BRAVO' },
      { nombre: 'Equipo Charlie', codigo: 'EQ-CHARLIE' }
    ];

    const equiposMap = {};

    for (const eq of equiposData) {
      let r = await pool.query('SELECT * FROM equipos WHERE codigo = $1', [eq.codigo]);
      if (r.rows.length === 0) {
        r = await pool.query(
          'INSERT INTO equipos (nombre, codigo, duracion_segundos) VALUES ($1, $2, 7200) RETURNING *',
          [eq.nombre, eq.codigo]
        );
        console.log(`[SEED] Creado equipo: ${eq.nombre} (${eq.codigo})`);
      } else {
        await pool.query('UPDATE equipos SET duracion_segundos = 7200 WHERE id = $1', [r.rows[0].id]);
      }
      equiposMap[eq.codigo] = r.rows[0].id;
    }

    // 5. Crear los 3 Fiscales y sus 3 Asistentes
    const rolInvestigador = (await pool.query("SELECT id FROM roles WHERE nombre = 'investigador'")).rows[0].id;
    const rolAsistente = (await pool.query("SELECT id FROM roles WHERE nombre = 'asistente'")).rows[0].id;

    const hashFiscal = await bcrypt.hash('fiscal123', 10);
    const hashAsistente = await bcrypt.hash('asistente123', 10);

    const usuariosData = [
      // Equipo Alfa
      { nombre: 'Fiscal Delegado Alfa', email: 'fiscal1@nexus.dae', hash: hashFiscal, rol_id: rolInvestigador, eq: equiposMap['EQ-ALFA'] },
      { nombre: 'Asistente Fiscal Alfa', email: 'asistente1@nexus.dae', hash: hashAsistente, rol_id: rolAsistente, eq: equiposMap['EQ-ALFA'] },
      // Alias de prueba anteriores asignados a Alfa
      { nombre: 'Investigador NEXUS', email: 'investigador@nexus.dae', hash: hashFiscal, rol_id: rolInvestigador, eq: equiposMap['EQ-ALFA'] },
      { nombre: 'Asistente Fiscal Demo', email: 'asistente@nexus.dae', hash: hashAsistente, rol_id: rolAsistente, eq: equiposMap['EQ-ALFA'] },

      // Equipo Bravo
      { nombre: 'Fiscal Delegado Bravo', email: 'fiscal2@nexus.dae', hash: hashFiscal, rol_id: rolInvestigador, eq: equiposMap['EQ-BRAVO'] },
      { nombre: 'Asistente Fiscal Bravo', email: 'asistente2@nexus.dae', hash: hashAsistente, rol_id: rolAsistente, eq: equiposMap['EQ-BRAVO'] },

      // Equipo Charlie
      { nombre: 'Fiscal Delegado Charlie', email: 'fiscal3@nexus.dae', hash: hashFiscal, rol_id: rolInvestigador, eq: equiposMap['EQ-CHARLIE'] },
      { nombre: 'Asistente Fiscal Charlie', email: 'asistente3@nexus.dae', hash: hashAsistente, rol_id: rolAsistente, eq: equiposMap['EQ-CHARLIE'] }
    ];

    for (const u of usuariosData) {
      const check = await pool.query('SELECT id FROM usuarios WHERE email = $1', [u.email]);
      if (check.rows.length === 0) {
        await pool.query(
          `INSERT INTO usuarios (nombre, email, password_hash, rol_id, equipo_id, activo, primera_vez)
           VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)`,
          [u.nombre, u.email, u.hash, u.rol_id, u.eq]
        );
        console.log(`[SEED] Creado usuario: ${u.nombre} (${u.email}) vinculado al equipo`);
      } else {
        await pool.query(
          `UPDATE usuarios SET equipo_id = $1, rol_id = $2 WHERE id = $3`,
          [u.eq, u.rol_id, check.rows[0].id]
        );
        console.log(`[SEED] Actualizado usuario existente: ${u.email} -> equipo`);
      }
    }

    // 6. Sembrar todos los casos (incluyendo los 3 nuevos)
    const adminRes = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@nexus.dae' LIMIT 1");
    const adminId = adminRes.rows[0]?.id || null;

    const candidateDirs = [
      path.resolve(__dirname, './public/casos'),
      path.resolve(__dirname, '../public/casos'),
      path.resolve(__dirname, '../casos')
    ];
    const casosDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
    let insertedCases = 0;
    let updatedCases = 0;

    if (fs.existsSync(casosDir)) {
      const files = fs.readdirSync(casosDir).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
      console.log(`[SEED] Procesando ${files.length} expedientes en ${casosDir}...`);

      for (const file of files) {
        const nameWithoutExt = file.substring(0, file.lastIndexOf('.')) || file;
        const underscoreIdx = nameWithoutExt.indexOf('_');
        let numeroRadicado = nameWithoutExt;
        let delito = 'DELITO NO ESPECIFICADO';

        if (underscoreIdx !== -1) {
          numeroRadicado = nameWithoutExt.substring(0, underscoreIdx);
          delito = nameWithoutExt.substring(underscoreIdx + 1).replace(/\(1\)/g, '').trim().toUpperCase();
        }

        const caseName = `Caso ${numeroRadicado}`;
        const imageUrl = `/casos/${encodeURIComponent(file)}`;
        const descripcion = `Expediente de investigación penal NUNC ${numeroRadicado} correspondiente al presunto delito de ${delito}.`;

        const checkCase = await pool.query('SELECT id FROM carpetas WHERE nombre = $1', [caseName]);
        if (checkCase.rows.length === 0) {
          await pool.query(
            `INSERT INTO carpetas (nombre, descripcion, imagen_url, tipo_delito, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [caseName, descripcion, imageUrl, delito, adminId]
          );
          insertedCases++;
        } else {
          await pool.query(
            `UPDATE carpetas SET imagen_url = $1, tipo_delito = $2 WHERE id = $3`,
            [imageUrl, delito, checkCase.rows[0].id]
          );
          updatedCases++;
        }
      }
    }

    console.log(`[SEED] Expedientes: ${insertedCases} insertados, ${updatedCases} actualizados.`);
    const totalCasesRes = await pool.query('SELECT count(*) FROM carpetas');
    console.log(`[SEED] Total carpetas en base de datos: ${totalCasesRes.rows[0].count}`);

    console.log('[SEED] ¡Siembra de producción completada con éxito!');
    process.exit(0);
  } catch (err) {
    console.error('[SEED ERROR] Error en la siembra:', err);
    process.exit(1);
  }
}

seedProduction();
