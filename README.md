<div align="center">

<img src="src/assets/fgn-logo.png" alt="Fiscalía General de la Nación" width="120" />

# NEXUS · DAE

### Plataforma de Relacionamiento e Identificación Sistemática de Modalidades para el Análisis del Delito Estratégico

**Fiscalía General de la Nación — Dirección de Análisis y Estrategia**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/Licencia-Uso_Interno_FGN-red)]()

</div>

---

## 📋 Tabla de Contenido

- [Descripción General](#-descripción-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelo de Base de Datos](#-modelo-de-base-de-datos)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Módulos Funcionales](#-módulos-funcionales)
- [Flujo de Uso del Sistema](#-flujo-de-uso-del-sistema)
- [Instalación y Despliegue](#-instalación-y-despliegue)
- [Variables de Entorno](#-variables-de-entorno)
- [Docker](#-docker)
- [Créditos](#-créditos)

---

## 🔍 Descripción General

**NEXUS-DAE** es un sistema web interactivo desarrollado para la **Fiscalía General de la Nación (FGN)** como herramienta de evaluación y entrenamiento de competencias analíticas para investigadores fiscales. El sistema simula un entorno de análisis criminal donde los investigadores deben:

1. **Analizar carpetas de casos** con sus documentos, actores, modalidades y patrones.
2. **Identificar relaciones y conexiones** entre casos aparentemente aislados.
3. **Conformar grupos de asociación delictiva** justificando cada vínculo por criterios criminológicos.
4. **Tomar decisiones fiscales** sobre cada grupo (órdenes judiciales, archivos, priorizaciones).
5. **Recibir retroalimentación automatizada** con puntajes basados en la solución experta del administrador.

El sistema opera bajo un **temporizador regresivo** configurable que simula la presión temporal de un entorno real de investigación, y genera un **reporte PDF descargable** con el desempeño del investigador.

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (SPA)                       │
│   React 18 + Vite + TailwindCSS + Zustand               │
│                                                         │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ LoginPage│ │DashboardAdmin│ │DashboardInvestigator │ │
│  └──────────┘ └──────────────┘ └──────────────────────┘ │
│       │              │                    │             │
│       │    ┌─────────┴────────────────────┘             │
│       │    │  Zustand Auth Store                        │
│       │    │  (useAuthStore / useGameStore)             │
│       └────┴─────────────┬────────────────              │
│                          │ Axios HTTP                   │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  API REST   │
                    │  Express.js │
                    │  Port 5000  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
        ┌─────┴───┐  ┌────┴────┐   ┌───────┴──────┐
        │  Auth   │  │Carpetas │   │   Grupos     │
        │  JWT    │  │  CRUD   │   │ Asociación   │
        │ bcrypt  │  │  Docs   │   │ Evaluaciones │
        └─────┬───┘  └────┬────┘   └───────┬──────┘
              │            │                │
              └────────────┼────────────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │   15-Alpine │
                    │  (Docker)   │
                    └─────────────┘
```

### Patrón de Arquitectura

| Capa | Tecnología | Responsabilidad |
|------|-----------|-----------------|
| **Presentación** | React 18 + TailwindCSS | SPA con renderizado condicional por rol |
| **Estado Global** | Zustand | Autenticación, sesión y estado del juego |
| **Comunicación** | Axios | Cliente HTTP con interceptores JWT |
| **API** | Express.js | REST API con middlewares de autenticación |
| **Persistencia** | PostgreSQL 15 | Base de datos relacional con UUID |
| **Contenedores** | Docker Compose | Orquestación de la base de datos |

---

## 🛠 Stack Tecnológico

### Frontend

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| `react` | ^18.3.1 | Librería de UI declarativa |
| `react-dom` | ^18.3.1 | Renderizado DOM |
| `axios` | ^1.6.2 | Cliente HTTP |
| `zustand` | ^5.0.3 | Manejo de estado global |
| `react-icons` | ^5.6.0 | Iconografía Feather Icons |
| `jspdf` | ^4.2.1 | Generación de reportes PDF |
| `vite` | ^5.4.14 | Bundler y dev server |
| `tailwindcss` | ^3.4.17 | Framework CSS utilitario |

### Backend

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| `express` | ^4.18.2 | Framework HTTP |
| `pg` | ^8.11.3 | Driver PostgreSQL |
| `bcryptjs` | ^2.4.3 | Hashing de contraseñas |
| `jsonwebtoken` | ^9.0.2 | Tokens de autenticación |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `dotenv` | ^16.3.1 | Variables de entorno |
| `nodemon` | ^3.0.2 | Hot reload en desarrollo |

---

## 📁 Estructura del Proyecto

```
NEXUS-DAE/
├── src/                            # Código fuente del frontend
│   ├── App.jsx                     # Router principal por rol
│   ├── main.jsx                    # Entry point de React
│   ├── index.css                   # Estilos globales + animaciones
│   ├── assets/                     # Recursos estáticos
│   │   ├── fgn-logo.png            # Logo Fiscalía General
│   │   ├── NEXUS-DAE.png           # Logo NEXUS-DAE
│   │   ├── NEXUS-DAE.png          # Logo NEXUS-DAE
│   │   ├── fondo-login.png         # Fondo de pantalla login
│   │   ├── fondo-admin.jpeg        # Fondo dashboard admin
│   │   └── ...                     # Más recursos gráficos
│   ├── components/                 # Componentes reutilizables
│   ├── pages/                      # Páginas principales
│   │   ├── LoginPage.jsx           # Autenticación
│   │   ├── DashboardAdmin.jsx      # Panel de administración
│   │   ├── DashboardInvestigator.jsx  # Panel del investigador
│   │   ├── CasesSidebarModule.jsx  # Módulo gestión de casos
│   │   ├── AssociationGroupsPage.jsx  # Procesos del despacho
│   │   ├── InvestigatorsManagementPage.jsx  # CRUD investigadores
│   │   └── InvestigatorFeedbackPage.jsx     # Resultados
│   └── store/                      # Estado global
│       ├── useAuthStore.js         # Autenticación y sesión
│       └── useGameStore.js         # Estado del juego
│
├── server/                         # Backend API
│   ├── index.js                    # Entry point Express
│   ├── db.js                       # Pool de conexión PostgreSQL
│   ├── routes/                     # Rutas REST
│   │   ├── auth.js                 # Login / registro / JWT
│   │   ├── carpetas.js             # CRUD de casos
│   │   ├── documentos.js           # CRUD de documentos
│   │   ├── conexiones.js           # Conexiones entre casos
│   │   ├── gruposAsociacion.js     # Grupos de asociación
│   │   ├── configuracion.js        # Config del sistema
│   │   ├── adminInvestigators.js   # Gestión de investigadores
│   │   └── investigacionFeedback.js # Evaluaciones y puntajes
│   └── .env                        # Variables de entorno local
│
├── init.sql                        # Schema + datos de prueba
├── docker-compose.yml              # Orquestación PostgreSQL
├── Dockerfile                      # Build de producción
├── vite.config.js                  # Configuración de Vite
├── tailwind.config.js              # Configuración de Tailwind
├── postcss.config.js               # PostCSS plugins
└── package.json                    # Dependencias del frontend
```

---

## 🗄 Modelo de Base de Datos

```
┌────────────┐       ┌────────────────┐       ┌─────────────┐
│   roles    │       │   usuarios     │       │  carpetas   │
├────────────┤       ├────────────────┤       ├─────────────┤
│ id (PK)    │◄──────│ rol_id (FK)    │       │ id (UUID)   │
│ nombre     │       │ id (UUID)      │──────►│ created_by  │
│ descripcion│       │ nombre         │       │ nombre      │
└────────────┘       │ email          │       │ descripcion │
                     │ password_hash  │       │ modalidad   │
                     │ activo         │       │ patrones    │
                     │ primera_vez    │       │ tipo_delito │
                     │ elapsed_seconds│       │ fecha_caso  │
                     └────────────────┘       │ victima     │
                                              │ victimario  │
                                              │ zona_territ.│
                                              │ es_aislado  │
                                              └──────┬──────┘
                                                     │
                     ┌───────────────────────────────┬┘
                     │                               │
              ┌──────┴──────┐                 ┌──────┴──────┐
              │ documentos  │                 │ conexiones  │
              ├─────────────┤                 ├─────────────┤
              │ id (UUID)   │                 │ id (UUID)   │
              │ carpeta_id  │                 │ carpeta_orig│
              │ nombre      │                 │ carpeta_dest│
              │ descripcion │                 │ tipo        │
              │ archivo_url │                 │ razonamiento│
              │ tipo_archivo│                 └─────────────┘
              └─────────────┘

              ┌──────────────────┐     ┌─────────────────────────┐
              │grupos_asociacion │     │ grupos_asociacion_casos │
              ├──────────────────┤     ├─────────────────────────┤
              │ id (UUID)        │◄────│ grupo_id (FK)           │
              │ nombre           │     │ carpeta_id (FK)         │
              │ patron_criminal  │     └─────────────────────────┘
              │ justificacion    │
              │ created_by       │     ┌───────────────────────────┐
              └──────────────────┘     │grupos_asociacion_relaciones│
                                       ├───────────────────────────┤
                                       │ grupo_id (FK)             │
              ┌──────────────────────┐ │ carpeta_a_id (FK)         │
              │evaluaciones_investig.│ │ carpeta_b_id (FK)         │
              ├──────────────────────┤ │ relation_type             │
              │ id (UUID)            │ │ justificacion             │
              │ usuario_id (FK)      │ └───────────────────────────┘
              │ puntaje              │
              │ expected_total       │ ┌───────────────────────────┐
              │ user_total           │ │grupos_asociacion_exclusiones│
              │ correct_pairs (JSONB)│ ├───────────────────────────┤
              │ incorrect_pairs      │ │ grupo_id (FK)             │
              │ missing_pairs        │ │ carpeta_id (FK)           │
              └──────────┬───────────┘ │ justificacion_no_relacion │
                         │             └───────────────────────────┘
              ┌──────────┴────────────┐
              │evaluacion_justificac. │
              ├───────────────────────┤
              │ evaluacion_id (FK)    │
              │ pair_key              │
              │ pair_label            │
              │ reason                │
              └───────────────────────┘
```

### Tablas Principales

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `roles` | 2 | admin, investigador |
| `usuarios` | N | Usuarios con hash bcrypt y JWT |
| `carpetas` | N | Casos penales con metadata criminal |
| `documentos` | N | Archivos PDF/evidencia por caso |
| `conexiones` | N | Relaciones entre pares de casos (admin) |
| `grupos_asociacion` | N | Agrupaciones de casos relacionados |
| `grupos_asociacion_casos` | N | Membresía caso ↔ grupo |
| `grupos_asociacion_relaciones` | N | Justificación par-a-par dentro del grupo |
| `grupos_asociacion_exclusiones` | N | Exclusiones justificadas |
| `evaluaciones_investigador` | 1/usuario | Resultado final de la prueba |
| `evaluacion_justificaciones` | N | Justificaciones de asociación del investigador |

---

## 🌐 API REST — Endpoints

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/login` | Autenticación con JWT |
| `POST` | `/register` | Registro de nuevo usuario |
| `GET` | `/me` | Perfil del usuario autenticado |

### Carpetas / Casos (`/api/carpetas`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listar todos los casos |
| `POST` | `/` | Crear nuevo caso (admin) |
| `PUT` | `/:id` | Editar caso (admin) |
| `DELETE` | `/:id` | Eliminar caso (admin) |

### Documentos (`/api/documentos`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/carpeta/:carpetaId` | Documentos de un caso |
| `POST` | `/` | Subir documento (admin) |
| `DELETE` | `/:id` | Eliminar documento (admin) |

### Conexiones (`/api/conexiones`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listar conexiones del admin |
| `POST` | `/` | Crear conexión esperada (admin) |
| `DELETE` | `/:id` | Eliminar conexión (admin) |

### Grupos de Asociación (`/api/grupos-asociacion`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listar grupos y sus relaciones |
| `POST` | `/` | Crear grupo con casos y justificaciones |
| `PUT` | `/:id` | Actualizar grupo |
| `DELETE` | `/:id` | Eliminar grupo |
| `POST` | `/:id/casos` | Agregar caso a grupo existente |
| `DELETE` | `/:id/casos/:carpetaId` | Quitar caso del grupo |

### Configuración (`/api/configuracion`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Obtener configuración actual |
| `PUT` | `/` | Actualizar tiempo límite y parámetros |

### Administración de Investigadores (`/api/admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/investigators` | Listar investigadores |
| `POST` | `/investigators` | Crear investigador |
| `PUT` | `/investigators/:id` | Editar investigador |
| `DELETE` | `/investigators/:id` | Eliminar investigador |
| `POST` | `/investigators/:id/reset` | Reiniciar progreso |

### Evaluaciones (`/api/investigacion-feedback`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/me` | Obtener evaluación del usuario |
| `POST` | `/` | Enviar feedback y calcular puntaje |

---

## 📦 Módulos Funcionales

### 1. 🔐 Módulo de Autenticación

- Login con email y contraseña
- Hashing con `bcryptjs`
- Tokens JWT con expiración
- Persistencia de sesión en `localStorage`
- Zustand store para estado global de auth

### 2. 👨‍💼 Dashboard del Administrador

- **Gestión de Casos**: CRUD completo de carpetas con metadata criminal (tipo de delito, modalidad, patrones, víctima, victimario, zona territorial, actores involucrados).
- **Gestión de Documentos**: Carga y asociación de documentos a cada caso.
- **Conexiones Esperadas**: Definición del "solucionario" — las relaciones correctas entre pares de casos que el sistema usará para evaluar a los investigadores.
- **Grupos de Asociación**: Creación de grupos temáticos con justificación general y relaciones par-a-par.
- **Gestión de Investigadores**: CRUD de usuarios investigadores, reseteo de progreso y monitoreo del estado de sus pruebas.
- **Configuración del Sistema**: Parámetros del tiempo límite de investigación.
- **Consulta de Resultados**: Visualización de las evaluaciones y puntajes de cada investigador.

### 3. 🕵️ Dashboard del Investigador

El investigador atraviesa **4 fases secuenciales** dentro de una experiencia gamificada:

#### Fase 1 — Lobby de Bienvenida
- Interfaz cinematográfica con tipografía mono y animaciones.
- Temporizador regresivo invasivo visible en todo momento.
- Acceso al tablero de casos y a la gestión de carpetas.

#### Fase 2 — Gestión de Casos (CasesSidebarModule)
- Galería visual de carpetas con metadata expandible.
- Visor de documentos asociados a cada caso.
- **Creación de Grupos**: Selección multi-checkbox de casos con justificación obligatoria, criterio de asociación (Modalidad, Modus Operandi, Patrón, Criterio de Conexidad, Fenómeno Criminal, Otros) y nombre personalizable.
- Los grupos creados persisten en base de datos mediante la API REST.
- Inline rename de grupos existentes.

#### Fase 3 — Tablero Analítico de Nodos
- **Motor de Físicas 2D** personalizado con:
  - Nodos circulares representando cada caso, animados con velocidad constante (`FIXED_SPEED = 1.4`).
  - Colisiones elásticas entre nodos con normalización de velocidad post-impacto.
  - Rebote en los bordes del lienzo virtual (2800×2200px).
  - Atracción gravitacional suave hacia el centroide del grupo.
  - Colisión entre regiones de grupo para evitar solapamientos.
  - Separación visual entre nodos miembros (`NODE_RADIUS * 3.5`) para que las líneas de conexión sean legibles.
- **Canvas interactivo** con zoom (rueda + botones), pan (arrastrar) y controles flotantes.
- **Regiones SVG** que dibujan los límites del grupo con nombre en mayúsculas, borde punteado y color personalizado.
- **Agrupación directa desde el tablero**: Clic en 2 nodos libres = crear nuevo grupo. Clic en nodo libre + nodo de grupo existente = agregar al grupo.
- Modal de justificación con los mismos campos del módulo de gestión.

#### Fase 4 — Toma de Decisiones
- Botón animado "**Tomar Decisiones**" con efecto de barrido luminoso en hover.
- Modal paso-a-paso que recorre **cada grupo creado** presentando:
  - **Panel izquierdo**: 7 opciones de decisión fiscal con checkboxes interactivos. Al marcar una opción, aparece dinámicamente la pregunta de justificación correspondiente.
  - **Panel derecho**: Información completa del grupo (criterio de asociación, justificación original, lista de miembros con radicados).
- Al completar todos los grupos: mensaje de confirmación "Decisiones Completadas".

### 4. 📊 Módulo de Evaluación

- Comparación automática de las conexiones del investigador vs. la solución experta del administrador.
- Cálculo de puntaje basado en:
  - **Pares correctos** (coincidencias con el solucionario).
  - **Pares incorrectos** (falsos positivos).
  - **Pares faltantes** (falsos negativos).
- Generación de reporte PDF descargable con `jsPDF`.
- Persistencia de la evaluación (una por investigador, `UNIQUE` constraint).

### 5. ⏱ Temporizador Regresivo

- Configurable desde el panel de administración (default: 180 minutos).
- Badge invasivo con animación `pulse` y `bounce` visible en todas las secciones.
- Muestra siempre el **tiempo restante** (no el transcurrido).
- Persiste el `elapsed_seconds` en el backend para continuidad entre sesiones.

---

## 🔄 Flujo de Uso del Sistema

```
┌──────────────────┐
│  ADMINISTRADOR   │
│                  │
│  1. Crear casos  │
│  2. Subir docs   │
│  3. Definir      │─────────── Solucionario (conexiones esperadas)
│     conexiones   │
│  4. Crear grupos │
│  5. Config tiempo│
│  6. Crear invest.│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  INVESTIGADOR    │
│                  │
│  1. Login        │
│  2. Leer casos   │
│  3. Analizar docs│
│  4. Crear grupos │──── Justificación obligatoria por par
│  5. Tablero nodos│──── Agrupación visual interactiva
│  6. Tomar decis. │──── Orden judicial / archivo / priorización
│  7. Terminar     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   EVALUACIÓN     │
│                  │
│  Comparación     │
│  automática vs   │
│  solucionario    │
│                  │
│  → Puntaje       │
│  → PDF Report    │
│  → Persistencia  │
└──────────────────┘
```

---

## 🚀 Instalación y Despliegue

### Prerrequisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Docker** y **Docker Compose** (para PostgreSQL)
- **Git**

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-org/NEXUS-DAE.git
cd NEXUS-DAE
```

### 2. Levantar la base de datos

```bash
docker compose up -d
```

Esto creará un contenedor PostgreSQL 15 con:
- **Usuario**: `nexus_admin`
- **Base de datos**: `nexus_dae`
- **Puerto**: `5435`
- **Schema**: Inicializado automáticamente desde `init.sql`

### 3. Configurar el backend

```bash
cd server
cp .env.example .env   # o editar .env directamente
npm install
npm run dev
```

El servidor Express estará disponible en `http://localhost:5000`.

### 4. Configurar el frontend

```bash
cd ..  # volver a la raíz
npm install
npm run dev
```

El cliente Vite estará disponible en `http://localhost:5173`.

### 5. Credenciales por defecto

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | `admin@nexus.dae` | `admin123` |
| **Investigador** | `investigador@nexus.dae` | `investigador123` |

---

## 🔑 Variables de Entorno

### Backend (`server/.env`)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5435
DB_USER=nexus_admin
DB_PASSWORD=nexus_secure_2026
DB_NAME=nexus_dae
JWT_SECRET=tu_clave_secreta_jwt
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🐳 Docker

### Base de datos solamente

```bash
docker compose up -d
```

### Build de producción completo

```bash
# Build del frontend
npm run build

# Copiar dist a server/public
cp -r dist/* server/public/

# Ejecutar servidor de producción
cd server
npm start
```

### Docker Compose (solo DB)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: nexus-dae-db
    environment:
      POSTGRES_USER: nexus_admin
      POSTGRES_PASSWORD: nexus_secure_2026
      POSTGRES_DB: nexus_dae
    ports:
      - "5435:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

---

## 🎨 Diseño Visual

El sistema implementa una estética **cyberpunk-forense** con:

- **Paleta oscura** (`slate-950`, `#070b13`, `#02050b`) con acentos cyan (`#06b6d4`).
- **Glassmorphism** con `backdrop-blur-md` y bordes semi-transparentes.
- **Tipografía monoespaciada** (`font-mono`) para evocar terminales de investigación.
- **Tracking expandido** en títulos (`tracking-[0.24em]`) para estética militar/forense.
- **Animaciones**: `pulse`, `bounce`, `welcome-zoom`, barridos luminosos de gradiente en hover.
- **Glow effects**: `shadow-[0_0_30px_rgba(6,182,212,0.25)]` en elementos interactivos.
- **Micro-interacciones**: Transiciones suaves en botones, modales con fade-in, nodos con brillo al seleccionar.

---

## 🧪 Datos de Prueba

El archivo `init.sql` incluye:

- 2 roles predefinidos (admin, investigador)
- 2 usuarios de prueba
- 3 casos de ejemplo con documentos
- 1 grupo de asociación con relaciones par-a-par
- Schema completo con índices optimizados

---

## 📄 Licencia

Este software es de **uso exclusivo interno** de la Fiscalía General de la Nación de Colombia. Todos los derechos reservados.

---

<div align="center">

### Desarrollado por

**JUAN SEBASTIAN CANO VASQUEZ**

*AUXILIAR I*

---

<img src="src/assets/fgn-logo.png" alt="FGN" width="80" />

**Fiscalía General de la Nación**

Dirección de Altos Estudios (DAE)

Colombia · 2026

---

*NEXUS-DAE v1.0.0*

</div>
