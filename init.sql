-- Crear extensiones si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predefinidos
INSERT INTO roles (nombre, descripcion) VALUES
  ('admin', 'Administrador del sistema - puede crear y editar casos'),
  ('investigador', 'Investigador / Fiscal - puede consultar casos y crear análisis'),
  ('asistente', 'Asistente de Fiscal - apoyo operativo y recepción de actuaciones') ON CONFLICT DO NOTHING;


-- Tabla de Equipos Mixtos (Fiscal + Asistente)
CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) UNIQUE,
  duracion_segundos INTEGER DEFAULT 7200,
  started_at TIMESTAMP,
  accumulated_penalty_seconds INTEGER DEFAULT 0,
  last_penalty JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT TRUE,
  primera_vez BOOLEAN DEFAULT TRUE,
  elapsed_seconds INTEGER DEFAULT 0,
  created_groups TEXT DEFAULT '[]',
  shown_event_ids TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Carpetas (Casos)
CREATE TABLE carpetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  modalidad VARCHAR(100),
  patrones VARCHAR(500),
  tipo_delito VARCHAR(150),
  fecha_caso DATE,
  victima TEXT,
  victimario TEXT,
  zona_territorial VARCHAR(180),
  actores_involucrados TEXT,
  es_aislado BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Documentos
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carpeta_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  archivo_url TEXT,
  tipo_archivo VARCHAR(50),
  tamaño_bytes INTEGER,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Conexiones entre Carpetas (para el grafo 3D)
CREATE TABLE conexiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carpeta_origen_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  carpeta_destino_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  razonamiento TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Grupos de Asociación
CREATE TABLE grupos_asociacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,  patron_criminal VARCHAR(255) DEFAULT '',  justificacion_general TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Casos pertenecientes a un grupo de asociación
CREATE TABLE grupos_asociacion_casos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id UUID NOT NULL REFERENCES grupos_asociacion(id) ON DELETE CASCADE,
  carpeta_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (grupo_id, carpeta_id)
);

-- Relaciones directas entre pares dentro de un grupo
CREATE TABLE grupos_asociacion_relaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id UUID NOT NULL REFERENCES grupos_asociacion(id) ON DELETE CASCADE,
  carpeta_a_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  carpeta_b_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,
  justificacion TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (grupo_id, carpeta_a_id, carpeta_b_id)
);

-- Casos excluidos de un grupo con justificación individual
CREATE TABLE grupos_asociacion_exclusiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id UUID NOT NULL REFERENCES grupos_asociacion(id) ON DELETE CASCADE,
  carpeta_id UUID NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  justificacion_no_relacion TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (grupo_id, carpeta_id)
);

-- Tabla de feedback final de la prueba investigativa (una por investigador)
CREATE TABLE evaluaciones_investigador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_nombre VARCHAR(120),
  puntaje INTEGER NOT NULL,
  expected_total INTEGER NOT NULL,
  user_total INTEGER NOT NULL,
  correct_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  incorrect_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Justificaciones de desacuerdo por conexión (solo cuando hay texto)
CREATE TABLE evaluacion_justificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_investigador(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  pair_label TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (evaluacion_id, pair_key)
);

-- Tabla de Eventos del Despacho
CREATE TABLE eventos_despacho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'informacion',
  imagen_url TEXT,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejores búsquedas
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX idx_carpetas_created_by ON carpetas(created_by);
CREATE INDEX idx_documentos_carpeta_id ON documentos(carpeta_id);
CREATE INDEX idx_documentos_created_by ON documentos(created_by);

-- Insertar usuario admin por defecto (contraseña: admin123)
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
  ('Admin NEXUS', 'admin@nexus.dae', '$2a$10$s6yQpoOpta7funCAvjN9Du0vmfL1gPTKiIdbioiqsxZ7j.mWTLiyi', 1);

-- Insertar usuario investigador de prueba (contraseña: investigador123)
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
  ('Investigador NEXUS', 'investigador@nexus.dae', '$2a$10$FKHCQXc7XFTROoLbl0aafuevadc.P1WuDQKOnmT8PZWszPqJed9l.', 2);

-- Insertar eventos de despacho por defecto para el tutorial
INSERT INTO eventos_despacho (nombre, descripcion, tipo, opciones) VALUES
  ('alerta_1', 'Se reporta una posible fuga de información de uno de tus investigadores. ¿Qué acción tomas?', 'alerta', '[{"texto": "Iniciar investigación disciplinaria", "valor": "disciplinaria"}, {"texto": "Ignorar por ahora", "valor": "ignorar"}]'::jsonb),
  ('persona_1', 'Un informante clave solicita una reunión de seguridad urgente fuera del despacho.', 'persona', '[{"texto": "Asistir con escolta policial", "valor": "asistir_escolta"}, {"texto": "Enviar a policía judicial", "valor": "enviar_pj"}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Tabla de Alertas e Interrupciones Delegadas al Asistente
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
