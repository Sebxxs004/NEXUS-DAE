import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
  FiClock,
  FiUsers,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiChevronRight,
  FiSearch,
  FiEye,
  FiLogOut,
  FiFolder,
  FiSend,
  FiAlertTriangle,
  FiShield,
  FiInbox,
  FiLayers,
  FiInfo,
  FiFilter,
  FiPlus,
  FiMinus,
  FiMaximize2,
  FiLink,
  FiZap,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiX
} from 'react-icons/fi';
import useAuthStore from '../store/useAuthStore';
import fgnLogo from '../assets/fgn-logo.png';
import nexusLogo from '../assets/NEXUS-DAE.png';
import fondoLogin from '../assets/fondo-login.png';

const API_URL = import.meta.env.DEV ? `http://${window.location.hostname}:5000/api` : (import.meta.env.VITE_API_URL || '/api');

// Catálogo Institucional de Decisiones del Asistente de Fiscal
// Conforme al Manual Específico de Funciones y Requisitos de la Fiscalía General de la Nación (Código: FGN-AP01-M-01)
const DECISIONES_ASISTENTE_FGN = [
  {
    id: 'FGN-01',
    label: '1. Elaborar y proyectar documentos judiciales (órdenes, oficios, requerimientos y minutas)',
    norma: 'Manual FGN (Función 7): Elaborar y proyectar los documentos necesarios propios de la función judicial.'
  },
  {
    id: 'FGN-02',
    label: '2. Apoyar la elaboración y seguimiento del programa metodológico de investigación',
    norma: 'Manual FGN (Función 2 y 5): Apoyar la planeación, desarrollo y seguimiento del programa metodológico con el Fiscal.'
  },
  {
    id: 'FGN-03',
    label: '3. Clasificar diligencias y actualizar sistemas de información misional (SPOA / Web)',
    norma: 'Manual FGN (Función 3 y 4): Clasificar diligencias y mantener actualizados los sistemas de información institucionales.'
  },
  {
    id: 'FGN-04',
    label: '4. Verificar aplicación del sistema de cadena de custodia y control de evidencias',
    norma: 'Manual FGN (Función 8): Apoyar al fiscal en la verificación de la aplicación del manual de cadena de custodia.'
  },
  {
    id: 'FGN-05',
    label: '5. Coordinar actos de policía judicial e impulso investigativo con peritos / investigadores',
    norma: 'Manual FGN (Función 1 y 6): Dar impulso a las investigaciones y coordinar diligencias con policía judicial.'
  },
  {
    id: 'FGN-06',
    label: '6. Atender a usuarios, apoderados o víctimas y brindar información legal autorizada',
    norma: 'Manual FGN (Función 10): Atender a los usuarios del servicio y brindar información procesal autorizada.'
  },
  {
    id: 'FGN-07',
    label: '7. Tramitar correspondencia, archivo documental o acciones constitucionales y administrativas',
    norma: 'Manual FGN (Función 11 y 15): Trámite de tutelas, peticiones, radicación y archivo oportuno de expedientes.'
  },
  {
    id: 'FGN-08',
    label: '8. Consolidar matrices técnicas, análisis delictivo e informes estadísticos del despacho',
    norma: 'Manual FGN (Función 9, 12 y 13): Modelos de priorización, análisis en contexto, estudios de caso e informes técnicos.'
  },
  {
    id: 'FGN-09',
    label: '9. Trasladar al Fiscal Delegado por ser decisión privativa de su competencia funcional',
    norma: 'Criterio de reserva funcional: Decisiones de fondo que competen de forma privativa al Fiscal Titular.'
  },
  {
    id: 'FGN-10',
    label: '10. Ignorar o descartar esta solicitud / actividad (sin trámite procesal)',
    norma: 'Descarte operativo por improcedencia, falta de legitimación o duplicidad de trámite.'
  },
  {
    id: 'FGN-11',
    label: '11. Otra decisión o trámite operativo conforme a las funciones del despacho',
    norma: 'Manual FGN (Función 18): Demás funciones asignadas inherentes a la formación y naturaleza del cargo.'
  }
];

// Actividades operativas y contextos del Despacho

// Catálogo de las 5 Alertas de Despacho para el Asistente de Fiscal (5 minutos de límite de decisión en pantalla)
// Nota: La Alerta 1 es recurrente cada 15 minutos (900s) del ejercicio. Se eliminó el reporte del investigador por ARKIVA.
const ALERTAS_DESPACHO_ASISTENTE = [
  {
    id: 'ALR-ASIST-01',
    numero: 1,
    tipoFlujo: 'opciones',
    esRecurrente: true,
    intervaloSegundos: 900, // Recurrente cada 15 minutos del ejercicio
    titulo: 'Víctima en sala',
    radicado: 'Proceso asignado al Despacho',
    delito: 'IMPULSO PROCESAL',
    descripcion:
      'Llega un usuario a su despacho para solicitar impulso procesal de un proceso asignado a la Fiscalía a la que se encuentra adscrito. Debe decidir cómo atender la situación.',
    opciones: [
      'A. Remitir a la Dirección de Atención al usuario',
      'B. Atender al usuario',
      'C. Agendar una cita para escucharlo',
      'D. Solicitarle que envíe un correo con su consulta'
    ]
  },
  {
    id: 'ALR-ASIST-02',
    numero: 2,
    tipoFlujo: 'opciones',
    esRecurrente: false,
    titulo: 'Usuario en Sala',
    radicado: 'Consulta de estado procesal',
    delito: 'ATENCIÓN AL USUARIO',
    descripcion:
      'Ha llegado un usuario al despacho para consultar el estado de un proceso cuando usted se dispone a salir a almorzar. Debe decidir cómo atender la situación:',
    opciones: [
      'A. Atender al usuario',
      'B. Reprogramar al usuario para atenderlo al regresar de almorzar',
      'C. Remitirlo al Fiscal del despacho para que lo atienda',
      'D. Sugerirle que envíe su consulta por correo'
    ]
  },
  {
    id: 'ALR-ASIST-03',
    numero: 3,
    tipoFlujo: 'enfoque_diferencial',
    esRecurrente: false,
    titulo: 'Alerta: usuario en sala',
    pendientesTexto: 'Pendientes: 50 peticiones, 400 correos, 7 OPJ por cumplir, 3 matrices por diligenciar.',
    subtituloCaso: 'Usuario con enfoque diferencial.',
    radicado: '540016000123202600104',
    delito: 'ENFOQUE DIFERENCIAL - ATENCIÓN AL USUARIO',
    opcionesIniciales: ['Atenderlo', 'Ignorarlo'],
    descripcion:
      'Se dirige a su despacho Ricardo Gómez Herrera, denunciante dentro de la noticia criminal 540016000123202600104 asignada a su despacho, con la siguiente vestimenta: vestido con flores amarillas y rosadas, botas negras femeninas y bolso color azul y amarillo de lado con mariposas verdes. Señala que siempre ha sido citado con el nombre de Ricardo Gómez pero él se identifica como Lucía Gómez Herrera, pronombre ella, género femenino, por lo que solicita sea considerado lo indicado para futuras citaciones. ¿Cómo le responde?',
    preguntaRespuesta: '¿Cómo le responde?'
  },
  {
    id: 'ALR-ASIST-04',
    numero: 4,
    tipoFlujo: 'enfoque_diferencial',
    esRecurrente: false,
    titulo: 'Alerta: usuario en sala',
    pendientesTexto:
      'Pendientes: 50 peticiones, 420 correos, 7 OPJ por cumplir, 3 matrices por diligenciar, 8 requerimientos del Ministerio Público.',
    subtituloCaso: 'Usuario con enfoque diferencial.',
    radicado: 'Proceso nuevo asignado a la Fiscalía',
    delito: 'ENFOQUE DIFERENCIAL E INTERSECCIONAL',
    opcionesIniciales: ['Atenderlo', 'Ignorarlo'],
    descripcion:
      'Una mujer indígena y transgénero, con voz gruesa, acude a su despacho para consultar un proceso nuevo asignado a dicha Fiscalía. Está molesta porque fue citada a un interrogatorio de indiciada por el policía judicial que apoya el despacho pero él se refirió a ella con su nombre de cédula y no como le pidió que la llamara, Violeta Rivera. Le indica que el policía judicial le indicó que no podía llamarla Violeta porque ese nombre no estaba registrado en el SPOA y tampoco se registraba su género. Explica que la situación le genera incomodidad y que afecta su libre desarrollo de la personalidad. Desde su rol ¿Cómo le responde?',
    preguntaRespuesta: 'Desde su rol ¿Cómo le responde?'
  },
  {
    id: 'ALR-ASIST-05',
    numero: 5,
    tipoFlujo: 'tutela',
    esRecurrente: false,
    titulo: 'CORREO ELECTRÓNICO',
    radicado: '540016001234202400567 (Tutela Rad. 2026-00678)',
    delito: 'ACCIÓN DE TUTELA',
    asuntoCorreo:
      'Su buzón del despacho tiene 300 correos sin leer. Recibe una notificación con Asunto: Auto admite tutela proceso No. 540016001234202400567',
    opcionesIniciales: ['Leer', 'Ignorar'],
    descripcion:
      'Notificación judicial de admisión de Acción de Tutela interpuesta por María Fernanda Contreras Durán en contra de Fiscalía 297 delegada ante Jueces del Circuito Especializados (Rad. No. 2026-00678) en el marco del proceso penal No. 540016001234202400567.',
    linkTutelaTexto: '11001418901120260067800',
    linkTutelaUrl:
      'https://etbcsj-my.sharepoint.com/:f:/g/personal/j11pqccmbta_cendoj_ramajudicial_gov_co/IgDHhPeTv9WrQr0YUjU_mhH3AXHSMVEr9jmkg6kJQ7IW6hk?e=jaGhLW',
    preguntaOpciones: 'Una vez verificada la información ¿cómo procede?',
    opciones: [
      'A. Redirecciona la acción de tutela a la Dirección de Asuntos Jurídicos, correo juridicanotificacionestutela@fiscalia.gov.co',
      'B. Revisa en el correo electrónico y en Arkiva la existencia de peticiones previas del accionante',
      'C. Traslada la tutela al correo del fiscal titular del despacho',
      'D. Revisa la tutela, los documentos asociados al NUNC en SPOA y proyecta la respuesta'
    ]
  }
];

const ACTIVIDADES_INICIALES = [
  {
    id: 'ACT-01',
    titulo: 'Revisar folios y proyectar solicitud a entidades bancarias',
    casoNombre: '110016000099202325078_estafa.png',
    radicado: '110016000099202325078',
    delito: 'ESTAFA',
    urgencia: 'ALTA',
    descripcion: 'Se radicó denuncia ciudadana con anexos digitales por transferencias bancarias no consentidas. Se requiere verificar cadena de custodia de comprobantes de pago y proyectar oficio de solicitud de extractos financieros a los bancos receptores para firma del Fiscal.',
    estado: 'PENDIENTE',
    opcionSeleccionada: '',
    justificacion: ''
  },
  {
    id: 'ACT-02',
    titulo: 'Proyectar orden de inspección a Policía Judicial (Cámaras)',
    casoNombre: '050016000206202100084_hurto calificado.png',
    radicado: '050016000206202100084',
    delito: 'HURTO CALIFICADO',
    urgencia: 'ALTA',
    descripcion: 'La víctima allegó registros fílmicos de cámaras de seguridad del establecimiento comercial donde ocurrió el hurto con intimidación con arma de fuego. Se requiere proyectar la orden de trabajo para Policía Judicial para cotejo morfológico y cadena de custodia del medio magnético.',
    estado: 'PENDIENTE',
    opcionSeleccionada: '',
    justificacion: ''
  },
  {
    id: 'ACT-03',
    titulo: 'Consolidar matriz de testigos y números telefónicos',
    casoNombre: '110016000099202101523_explotacion ilicita de yacimiento minero.png',
    radicado: '110016000099202101523',
    delito: 'EXPLOTACIÓN ILÍCITA DE YACIMIENTO MINERO',
    urgencia: 'MEDIA',
    descripcion: 'Organizar los datos de contacto, ubicaciones de campo y versiones preliminares recepcionadas en el informe de campo para alistar la matriz de conexidad y remitirla al Fiscal Delegado.',
    estado: 'PENDIENTE',
    opcionSeleccionada: '',
    justificacion: ''
  },
  {
    id: 'ACT-04',
    titulo: 'Solicitud externa de copias del proceso por apoderado judicial',
    casoNombre: null,
    radicado: 'General / Sin expediente individual',
    delito: 'Atención y Trámite Ciudadano',
    urgencia: 'NORMAL',
    descripcion: 'Un abogado defensor se presenta en ventanilla y solicita copia simple de las últimas actuaciones del despacho sin haber radicado aún el poder especial debidamente conferido ni exhibir tarjeta profesional vigente.',
    estado: 'PENDIENTE',
    opcionSeleccionada: '',
    justificacion: ''
  },
  {
    id: 'ACT-05',
    titulo: 'Verificación de vencimiento de términos y control de archivo',
    casoNombre: null,
    radicado: 'General / Auditoría de Despacho',
    delito: 'Control y Gestión Procesal SPOA',
    urgencia: 'MEDIA',
    descripcion: 'Alerta preventiva del sistema de gestión: revisión del inventario del despacho para identificar indagaciones preliminares que estén próximas a cumplir el término legal sin formulación de imputación o solicitud de preclusión.',
    estado: 'PENDIENTE',
    opcionSeleccionada: '',
    justificacion: ''
  }
];

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function DashboardAsistente({ token, usuario }) {
  const { completarPrimeraVez, guardarGrupos } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(() => usuario?.primera_vez !== false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTeamSetupModal, setShowTeamSetupModal] = useState(false);

  const [actividades, setActividades] = useState(ACTIVIDADES_INICIALES);
  const [carpetas, setCarpetas] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Filtros de búsqueda (igual que en el Módulo de Casos del Fiscal)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelito, setSelectedDelito] = useState('Todos');

  // Estados de Propuestas de Asociación (Fase 1 - Rol Asistente de Fiscal)
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [createdGroups, setCreatedGroups] = useState(() => {
    try {
      return usuario?.created_groups ? JSON.parse(usuario.created_groups) : [];
    } catch {
      return [];
    }
  });
  const [expandedGroupIds, setExpandedGroupIds] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [justifyMode, setJustifyMode] = useState('create'); // 'create' | 'add'
  const [asociarPor, setAsociarPor] = useState('Patrón criminal');
  const [sugerenciaActuacion, setSugerenciaActuacion] = useState('');
  const [justificacionText, setJustificacionText] = useState('');
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('');

  const GROUP_COLORS = useMemo(() => [
    'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    'border-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    'border-fuchsia-500 bg-fuchsia-950/20 shadow-[0_0_15px_rgba(217,70,239,0.25)]',
    'border-rose-500 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
    'border-indigo-500 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
    'border-violet-500 bg-violet-950/20 shadow-[0_0_15px_rgba(139,92,246,0.25)]',
    'border-teal-500 bg-teal-950/20 shadow-[0_0_15px_rgba(20,184,166,0.25)]',
  ], []);

  // Estados de Fase 2: Priorización de la gestión de las órdenes a su cargo (7 órdenes a Policía Judicial)
  const ORDENES_PJ_FASE2 = useMemo(() => [
    {
      id: 'OPJ-12881112',
      indice: 1,
      numero: '12881112',
      titulo: 'Orden Policía Judicial No. 12881112 - Contratación',
      archivo: 'OrdenPoliciaJudicial_12881112 CONTRATACION.pdf'
    },
    {
      id: 'OPJ-12881113',
      indice: 2,
      numero: '12881113',
      titulo: 'Orden Policía Judicial No. 12881113 - Servidor Público',
      archivo: 'OrdenPoliciaJudicial_12881113 Servidor Público.pdf'
    },
    {
      id: 'OPJ-12881114',
      indice: 3,
      numero: '12881114',
      titulo: 'Orden Policía Judicial No. 12881114',
      archivo: 'OrdenPoliciaJudicial_12881114.pdf'
    },
    {
      id: 'OPJ-12881115',
      indice: 4,
      numero: '12881115',
      titulo: 'Orden Policía Judicial No. 12881115 - Violencia Intrafamiliar',
      archivo: 'OrdenPoliciaJudicial_12881115 V INTRA.pdf'
    },
    {
      id: 'OPJ-12881116',
      indice: 5,
      numero: '12881116',
      titulo: 'Orden Policía Judicial No. 12881116 - Concusión 02',
      archivo: 'OrdenPoliciaJudicial_12881116 concusión 02.pdf'
    },
    {
      id: 'OPJ-12881118',
      indice: 6,
      numero: '12881118',
      titulo: 'Orden Policía Judicial No. 12881118 - Hurto 201',
      archivo: 'OrdenPoliciaJudicial_12881118 HURTO 201.pdf'
    },
    {
      id: 'OPJ-12881119',
      indice: 7,
      numero: '12881119',
      titulo: 'Orden Policía Judicial No. 12881119 - Tráfico de Influencias',
      archivo: 'OrdenPoliciaJudicial_12881119 TRAFICO INCLUENCIAS.pdf'
    }
  ], []);

  const formatOrdenPrioridadTexto = (orderedList) =>
    orderedList
      .map((item, pos) => `${pos + 1}° Prioridad: Orden #${item.indice} (${item.titulo})`)
      .join(', ');

  const [mostrarListaOrdenesPj, setMostrarListaOrdenesPj] = useState(true);
  const [ordenPriorizadaList, setOrdenPriorizadaList] = useState(() => {
    try {
      const savedIds = localStorage.getItem(`nexus_fase2_orden_ids_${usuario?.id}`);
      if (savedIds) {
        const parsedIds = JSON.parse(savedIds);
        if (Array.isArray(parsedIds) && parsedIds.length === 7) {
          const mapped = parsedIds
            .map((id) => ORDENES_PJ_FASE2.find((o) => o.id === id))
            .filter(Boolean);
          if (mapped.length === 7) return mapped;
        }
      }
    } catch {
      // ignore
    }
    return ORDENES_PJ_FASE2;
  });
  const [draggedOrdenIdx, setDraggedOrdenIdx] = useState(null);
  const [dragOverOrdenIdx, setDragOverOrdenIdx] = useState(null);

  const [propuestaPriorizacionOrdenes, setPropuestaPriorizacionOrdenes] = useState(() => {
    try {
      return localStorage.getItem(`nexus_fase2_priorizacion_${usuario?.id}`) || '';
    } catch {
      return '';
    }
  });
  const [justificacionPriorizacionOrdenes, setJustificacionPriorizacionOrdenes] = useState(() => {
    try {
      return localStorage.getItem(`nexus_fase2_justificacion_${usuario?.id}`) || '';
    } catch {
      return '';
    }
  });
  const [priorizacionGuardadaMsg, setPriorizacionGuardadaMsg] = useState(false);

  // Mantener sincronizado el texto de priorización separado por comas según el orden de los 7 rectángulos
  useEffect(() => {
    const textoGenerado = formatOrdenPrioridadTexto(ordenPriorizadaList);
    setPropuestaPriorizacionOrdenes(textoGenerado);
  }, [ordenPriorizadaList]);

  const handleMoveOrdenPrioridad = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= ordenPriorizadaList.length || fromIdx === toIdx) return;
    setOrdenPriorizadaList((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const handleDescargarTodasLasOrdenes = () => {
    setMostrarListaOrdenesPj(true);
    ORDENES_PJ_FASE2.forEach((orden, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/ordenes/${encodeURIComponent(orden.archivo)}`;
        link.download = orden.archivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
  };

  const handleGuardarFase2Priorizacion = () => {
    if (!justificacionPriorizacionOrdenes.trim()) {
      alert('Por favor diligencie la justificación de su propuesta de priorización.');
      return;
    }
    const textoFinalPriorizacion = formatOrdenPrioridadTexto(ordenPriorizadaList);
    setPropuestaPriorizacionOrdenes(textoFinalPriorizacion);
    try {
      localStorage.setItem(
        `nexus_fase2_orden_ids_${usuario?.id}`,
        JSON.stringify(ordenPriorizadaList.map((o) => o.id))
      );
      localStorage.setItem(`nexus_fase2_priorizacion_${usuario?.id}`, textoFinalPriorizacion);
      localStorage.setItem(`nexus_fase2_justificacion_${usuario?.id}`, justificacionPriorizacionOrdenes.trim());
      setPriorizacionGuardadaMsg(true);
      setTimeout(() => setPriorizacionGuardadaMsg(false), 3500);
    } catch (e) {
      console.error('Error guardando Fase 2:', e);
    }
  };

  // Modal de resolución de actividad
  const [actividadModal, setActividadModal] = useState(null);
  const [opcionTemporal, setOpcionTemporal] = useState('');
  const [otraOpcionTexto, setOtraOpcionTexto] = useState('');
  const [justificacionTemporal, setJustificacionTemporal] = useState('');
  
  // Estados de Alerta Periódica de Despacho (5 min de duración en pantalla, Alerta 1 recurrente cada 15 min)
  const [alertaDespachoActiva, setAlertaDespachoActiva] = useState(null);
  const [alertaStep, setAlertaStep] = useState(1); // Paso 1 o 2 para alertas de enfoque diferencial y tutela
  const [alertaCountdown, setAlertaCountdown] = useState(300); // 5 minutos = 300s
  const [shownAlertasAsistenteIds, setShownAlertasAsistenteIds] = useState([]);
  const [lastAlertaTriggerTime, setLastAlertaTriggerTime] = useState(null);
  const [lastRecurringAlertaTime, setLastRecurringAlertaTime] = useState(null);
  const [recurringInstanceCount, setRecurringInstanceCount] = useState(0);
  const [guardandoGestion, setGuardandoGestion] = useState(false);

  // Modal de Visualización / Lightbox a pantalla completa con zoom y pan
  const [detailCase, setDetailCase] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Notificación flotante de alerta delegada
  const [notificacionDelegada, setNotificacionDelegada] = useState(null);
  const seenDelegatedIdsRef = useRef(new Set());

  // Timer compartido (2 horas = 7200s por defecto)
  const [timeLeft, setTimeLeft] = useState(7200);
  const [teamMembersInputString, setTeamMembersInputString] = useState(() => {
    try {
      const raw = localStorage.getItem(`nexus_team_members_raw_${usuario?.id}`);
      if (raw) return raw;
      const saved = localStorage.getItem(`nexus_team_members_${usuario?.id}`);
      return saved ? JSON.parse(saved).join(', ') : '';
    } catch {
      return '';
    }
  });
  const [teamTimerStarted, setTeamTimerStarted] = useState(false);
  const [lastPenaltyAnim, setLastPenaltyAnim] = useState(null);
  const lastPenaltyIdRef = useRef(null);

  // Integrantes del equipo
  const [equipoInfo, setEquipoInfo] = useState({
    nombre: usuario?.equipo_nombre || 'Equipo de Investigación',
    codigo: usuario?.equipo_codigo || 'EQ-DAE',
    integrantes: []
  });

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const equipoId = usuario?.equipo_id || 'general';

  // Sincronizar estado de primera vez y propuestas de asociación si cambia usuario
  useEffect(() => {
    if (usuario && usuario.primera_vez !== false && !showInstructions && !showTeamSetupModal) {
      setShowWelcome(true);
    }
    if (usuario?.created_groups) {
      try {
        setCreatedGroups(JSON.parse(usuario.created_groups));
      } catch (e) {
        console.error(e);
      }
    }
  }, [usuario]);

  // 1. Cargar carpetas/casos
  useEffect(() => {
    const fetchCases = async () => {
      setLoadingCases(true);
      try {
        const res = await axios.get(`${API_URL}/carpetas`, { headers: authHeaders });
        setCarpetas(res.data || []);
      } catch (err) {
        console.warn('Error cargando carpetas:', err);
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [authHeaders]);

  // 2. Cargar información del equipo
  useEffect(() => {
    if (!usuario?.equipo_id) return;
    const fetchEquipo = async () => {
      try {
        const res = await axios.get(`${API_URL}/equipos`, { headers: authHeaders });
        const list = res.data || [];
        const match = list.find((e) => e.id === usuario.equipo_id);
        if (match) {
          setEquipoInfo({
            nombre: match.nombre,
            codigo: match.codigo,
            integrantes: match.integrantes || []
          });
        }
      } catch (err) {
        console.warn('Error obteniendo equipo:', err);
      }
    };
    fetchEquipo();
  }, [usuario?.equipo_id, authHeaders]);

  // 3. Polling de timer sincronizado (2 HORAS = 7200s COMPARTIDAS)
  useEffect(() => {
    // Si ya no es primera vez y entra, iniciar timer si no ha iniciado
    if (usuario?.equipo_id && usuario?.primera_vez === false) {
      axios.post(`${API_URL}/equipos/${usuario.equipo_id}/timer/start`, {}, { headers: authHeaders })
        .then(() => setTeamTimerStarted(true))
        .catch(console.warn);
    }

    // Tick local cada segundo para fluidez continua (solo si el timer ya inició)
    const tickInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (!teamTimerStarted) return 7200;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    if (!usuario?.equipo_id) {
      return () => clearInterval(tickInterval);
    }

    const pollTimer = async () => {
      try {
        const res = await axios.get(`${API_URL}/equipos/${usuario.equipo_id}/timer`, { headers: authHeaders });
        if (res.data) {
          if (res.data.started) {
            setTeamTimerStarted(true);
            const rem = res.data.timeLeftSeconds ?? res.data.time_left_seconds ?? 7200;
            setTimeLeft(rem);
          } else {
            setTeamTimerStarted(false);
            setTimeLeft(7200);
          }
          const penalty = res.data.lastPenalty || res.data.last_penalty;
          if (penalty && penalty.timestamp !== lastPenaltyIdRef.current) {
            lastPenaltyIdRef.current = penalty.timestamp;
            setLastPenaltyAnim(penalty);
            setTimeout(() => setLastPenaltyAnim(null), 3500);
          }
        }
      } catch (err) {
        console.warn('Error polling timer:', err);
      }
    };

    pollTimer();
    const interval = setInterval(pollTimer, 1500);
    return () => {
      clearInterval(tickInterval);
      clearInterval(interval);
    };
  }, [usuario?.equipo_id, authHeaders, usuario?.primera_vez, teamTimerStarted]);

  // 5. Disparo de Alertas de Despacho:
  // - Alerta 1 (ALR-ASIST-01: Víctima en sala genérica) es RECURRENTE cada 15 minutos (900s) del ejercicio.
  // - Alertas 2, 3, 4 y 5 aparecen de forma periódica durante el ejercicio.
  // - Todas disponen de 5 minutos (300s) en pantalla para ser atendidas.
  useEffect(() => {
    if (showWelcome || showInstructions || showTeamSetupModal) return;

    const elapsed = Math.max(0, 7200 - timeLeft);
    if (lastAlertaTriggerTime === null) {
      setLastAlertaTriggerTime(elapsed);
      setLastRecurringAlertaTime(elapsed);
      return;
    }

    if (alertaDespachoActiva !== null) return;

    // 1. Verificar primero si corresponde lanzar la Alerta 1 recurrente (cada 15 minutos = 900s)
    const diffRecurring = elapsed - (lastRecurringAlertaTime ?? 0);
    if (diffRecurring >= 900) {
      const recurringAlertTemplate = ALERTAS_DESPACHO_ASISTENTE.find((a) => a.id === 'ALR-ASIST-01');
      if (recurringAlertTemplate) {
        const nextCount = recurringInstanceCount + 1;
        setAlertaDespachoActiva({
          ...recurringAlertTemplate,
          instanceId: `ALR-ASIST-01-R${nextCount}`
        });
        setAlertaStep(1);
        setAlertaCountdown(300); // 5 minutos = 300s
        setOpcionTemporal('');
        setOtraOpcionTexto('');
        setJustificacionTemporal('');
        setRecurringInstanceCount(nextCount);
        setLastRecurringAlertaTime(elapsed);
        setLastAlertaTriggerTime(elapsed);
        return;
      }
    }

    // 2. Verificar si corresponde lanzar alguna de las alertas no recurrentes (Alertas 2, 3, 4, 5) cada 10 min (600s)
    const requiredDelay = 600;
    const diff = elapsed - lastAlertaTriggerTime;

    if (diff >= requiredDelay) {
      const available = ALERTAS_DESPACHO_ASISTENTE.filter(
        (a) => !a.esRecurrente && !shownAlertasAsistenteIds.includes(a.id)
      );
      if (available.length > 0) {
        const nextAlert = available[0];
        setAlertaDespachoActiva(nextAlert);
        setAlertaStep(1);
        setAlertaCountdown(300); // 5 minutos = 300s
        setOpcionTemporal('');
        setOtraOpcionTexto('');
        setJustificacionTemporal('');
        setShownAlertasAsistenteIds((prev) => [...prev, nextAlert.id]);
        setLastAlertaTriggerTime(elapsed);
      }
    }
  }, [
    timeLeft,
    showWelcome,
    showInstructions,
    showTeamSetupModal,
    alertaDespachoActiva,
    lastAlertaTriggerTime,
    lastRecurringAlertaTime,
    recurringInstanceCount,
    shownAlertasAsistenteIds
  ]);

  // Conteo regresivo de la Alerta (5 minutos en pantalla)
  useEffect(() => {
    if (!alertaDespachoActiva) return;

    const interval = setInterval(() => {
      setAlertaCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAlertaTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alertaDespachoActiva]);

  const handleAlertaTimeout = async () => {
    if (!alertaDespachoActiva) return;
    setAlertaDespachoActiva(null);
    setAlertaStep(1);
    if (usuario?.equipo_id) {
      try {
        await axios.post(
          `${API_URL}/equipos/${usuario.equipo_id}/timer/penalty`,
          {
            minutes: 2,
            reason: 'Tiempo límite agotado en Alerta del Despacho (5 min)',
            byUser: usuario?.nombre || 'Asistente de Fiscal'
          },
          { headers: authHeaders }
        );
      } catch (e) {
        console.warn('Error aplicando penalización por tiempo agotado en alerta:', e);
      }
    }
  };

  // Manejo de acciones del Paso 1 para Alertas 3, 4 (Atenderlo / Ignorarlo) y Alerta 5 (Leer / Ignorar)
  const handleAccionInicialAlerta = (accion) => {
    if (!alertaDespachoActiva) return;

    if (accion === 'Ignorarlo' || accion === 'Ignorar') {
      const nuevaActividadIgnorada = {
        id: alertaDespachoActiva.instanceId || alertaDespachoActiva.id,
        titulo: alertaDespachoActiva.titulo,
        radicado: alertaDespachoActiva.radicado,
        delito: alertaDespachoActiva.delito,
        urgencia: 'ALTA',
        descripcion: alertaDespachoActiva.asuntoCorreo || alertaDespachoActiva.descripcion,
        estado: 'IGNORADA',
        opcionSeleccionada: accion,
        justificacion: 'El asistente decidió ignorar la alerta en pantalla.',
        esDelegadaPorFiscal: false
      };
      setActividades((prev) => [nuevaActividadIgnorada, ...prev]);
      setAlertaDespachoActiva(null);
      setAlertaStep(1);
      return;
    }

    // Si elige "Atenderlo" o "Leer", avanza al Paso 2 de la ventana emergente
    setOpcionTemporal('');
    setJustificacionTemporal('');
    setAlertaStep(2);
  };

  const handleResolverAlertaDespacho = async () => {
    if (!alertaDespachoActiva) return;

    // Validación según el tipo de flujo de la alerta
    if (alertaDespachoActiva.tipoFlujo === 'enfoque_diferencial') {
      if (!justificacionTemporal.trim()) {
        alert('Por favor escriba su respuesta al usuario para resolver la situación.');
        return;
      }

      const nuevaActividadResuelta = {
        id: alertaDespachoActiva.instanceId || alertaDespachoActiva.id,
        titulo: `${alertaDespachoActiva.titulo} - ${alertaDespachoActiva.subtituloCaso || 'Enfoque Diferencial'}`,
        radicado: alertaDespachoActiva.radicado,
        delito: alertaDespachoActiva.delito,
        urgencia: 'ALTA',
        descripcion: alertaDespachoActiva.descripcion,
        estado: 'RESUELTA',
        opcionSeleccionada: 'Atender al usuario (Enfoque Diferencial)',
        justificacion: justificacionTemporal.trim(),
        esDelegadaPorFiscal: false
      };

      setActividades((prev) => [nuevaActividadResuelta, ...prev]);
      setAlertaDespachoActiva(null);
      setAlertaStep(1);
      return;
    }

    // Para Alertas 1, 2 y Paso 2 de Alerta 5 (Tutela)
    if (!opcionTemporal) {
      alert('Por favor seleccione una de las opciones (A, B, C o D) para atender la situación.');
      return;
    }

    const nuevaActividadResuelta = {
      id: alertaDespachoActiva.instanceId || alertaDespachoActiva.id,
      titulo: alertaDespachoActiva.titulo,
      radicado: alertaDespachoActiva.radicado,
      delito: alertaDespachoActiva.delito,
      urgencia: 'ALTA',
      descripcion: alertaDespachoActiva.descripcion,
      estado: 'RESUELTA',
      opcionSeleccionada: opcionTemporal,
      justificacion: justificacionTemporal.trim() || `Opción seleccionada: ${opcionTemporal}`,
      esDelegadaPorFiscal: false
    };

    setActividades((prev) => [nuevaActividadResuelta, ...prev]);
    setAlertaDespachoActiva(null);
    setAlertaStep(1);
  };

  // 4. Polling de alertas delegadas por el Fiscal
  useEffect(() => {
    const fetchDelegatedAlerts = async () => {
      try {
        const res = await axios.get(`${API_URL}/equipos/${encodeURIComponent(equipoId)}/alertas`, { headers: authHeaders });
        const serverAlerts = res.data || [];
        if (!Array.isArray(serverAlerts) || serverAlerts.length === 0) return;

        setActividades((prev) => {
          const currentMap = new Map(prev.map((a) => [a.id, a]));
          let updatedList = [...prev];

          serverAlerts.forEach((srvAlert) => {
            if (!currentMap.has(srvAlert.id)) {
              const nueva = {
                id: srvAlert.id,
                titulo: srvAlert.titulo,
                casoNombre: srvAlert.caso_nombre || srvAlert.casoNombre,
                radicado: srvAlert.radicado,
                delito: srvAlert.delito,
                urgencia: 'ALTA',
                descripcion: srvAlert.dialogo || srvAlert.subtitulo,
                estado: srvAlert.estado || 'PENDIENTE',
                opcionSeleccionada: srvAlert.opcion_seleccionada || '',
                justificacion: srvAlert.justificacion || '',
                esDelegadaPorFiscal: true,
                delegadoPor: srvAlert.delegado_por || 'Fiscal Delegado'
              };
              updatedList = [nueva, ...updatedList];
            } else {
              const existing = currentMap.get(srvAlert.id);
              if (srvAlert.estado && srvAlert.estado !== existing.estado) {
                existing.estado = srvAlert.estado;
                existing.opcionSeleccionada = srvAlert.opcion_seleccionada || existing.opcionSeleccionada;
                existing.justificacion = srvAlert.justificacion || existing.justificacion;
              }
            }
          });

          return updatedList;
        });

        // Alerta toast para nuevas recepciones
        serverAlerts.forEach((srvAlert) => {
          if (!seenDelegatedIdsRef.current.has(srvAlert.id)) {
            seenDelegatedIdsRef.current.add(srvAlert.id);
            setNotificacionDelegada({
              id: srvAlert.id,
              titulo: srvAlert.titulo,
              delito: srvAlert.delito,
              delegadoPor: srvAlert.delegado_por || 'Fiscal Delegado'
            });
            setTimeout(() => setNotificacionDelegada(null), 5500);
          }
        });
      } catch (_err) {
        // Silencioso en desconexión
      }
    };

    fetchDelegatedAlerts();
    const interval = setInterval(fetchDelegatedAlerts, 2500);
    return () => clearInterval(interval);
  }, [equipoId, authHeaders]);

  // Manejo de Propuestas de Asociación (Fase 1 - Asistente de Fiscal)
  const handleCreateGroup = () => {
    if (selectedCaseIds.length < 2) return;
    const newGroupId = `prop-asist-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: `Propuesta ${createdGroups.length + 1}`,
      color: GROUP_COLORS[createdGroups.length % GROUP_COLORS.length],
      caseIds: [...selectedCaseIds],
      asociarPor,
      sugerenciaActuacion: sugerenciaActuacion.trim(),
      justificacion: justificacionText.trim(),
      rolOrigen: 'asistente'
    };
    const updatedGroups = [...createdGroups, newGroup];
    setCreatedGroups(updatedGroups);
    setExpandedGroupIds((prev) => [...prev, newGroupId]);
    guardarGrupos(updatedGroups);
    setSelectedCaseIds([]);
  };

  const handleAddToGroup = (groupId) => {
    if (selectedCaseIds.length === 0) return;
    const updatedGroups = createdGroups
      .map((g) => {
        if (g.id === groupId) {
          const newIds = [...(g.caseIds || [])];
          selectedCaseIds.forEach((id) => {
            if (!newIds.includes(id)) newIds.push(id);
          });
          return {
            ...g,
            caseIds: newIds,
            asociarPor,
            sugerenciaActuacion: sugerenciaActuacion.trim() || g.sugerenciaActuacion,
            justificacion: g.justificacion
              ? `${g.justificacion}\n[Anexo]: ${justificacionText.trim()}`
              : justificacionText.trim()
          };
        }
        return { ...g, caseIds: (g.caseIds || []).filter((id) => !selectedCaseIds.includes(id)) };
      })
      .filter((g) => (g.caseIds || []).length > 0);

    setCreatedGroups(updatedGroups);
    setExpandedGroupIds((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
    guardarGrupos(updatedGroups);
    setSelectedCaseIds([]);
  };

  const handleSaveGroupName = (groupId) => {
    if (!editGroupName.trim()) return;
    const updated = createdGroups.map((g) => (g.id === groupId ? { ...g, name: editGroupName.trim() } : g));
    setCreatedGroups(updated);
    guardarGrupos(updated);
    setEditingGroupId(null);
  };

  const handleOpenCreateModal = () => {
    if (selectedCaseIds.length < 2) return;
    setJustifyMode('create');
    setAsociarPor('Patrón criminal');
    setSugerenciaActuacion('');
    setJustificacionText('');
    setIsJustifyModalOpen(true);
  };

  const handleOpenAddModal = () => {
    if (selectedCaseIds.length < 1 || createdGroups.length === 0) return;
    setJustifyMode('add');
    setSelectedTargetGroupId(createdGroups[0]?.id || '');
    setAsociarPor('Patrón criminal');
    setSugerenciaActuacion('');
    setJustificacionText('');
    setIsJustifyModalOpen(true);
  };

  const handleConfirmJustification = () => {
    if (!justificacionText.trim()) {
      alert('Por favor ingresa la justificación de por qué consideras que estos casos se pueden asociar según el patrón o fenómeno criminal identificado.');
      return;
    }
    if (justifyMode === 'create') {
      handleCreateGroup();
    } else if (justifyMode === 'add') {
      handleAddToGroup(selectedTargetGroupId);
    }
    setIsJustifyModalOpen(false);
  };

  const handleResetGroups = () => {
    if (!window.confirm('¿Deseas deshacer todas las propuestas de asociación creadas?')) return;
    setCreatedGroups([]);
    setExpandedGroupIds([]);
    setSelectedCaseIds([]);
    guardarGrupos([]);
  };

  const handleRemoveFromGroup = (groupId, caseId) => {
    const c = carpetas.find((item) => item.id === caseId);
    const caseName = c ? c.nombre.replace('Caso ', '') : '';
    const confirmDelete = window.confirm(`¿Está seguro de que desea retirar el Radicado ${caseName} de esta propuesta de asociación?`);
    if (!confirmDelete) return;

    const updatedGroups = createdGroups
      .map((g) => {
        if (g.id === groupId) {
          return { ...g, caseIds: (g.caseIds || []).filter((id) => id !== caseId) };
        }
        return g;
      })
      .filter((g) => (g.caseIds || []).length > 0);

    setCreatedGroups(updatedGroups);
    guardarGrupos(updatedGroups);
  };

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Manejo de zoom y pan en el visor
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.25, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.15;
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(prev + zoomIntensity, 4));
    } else {
      setZoomScale((prev) => {
        const next = Math.max(prev - zoomIntensity, 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleOpenDetailModal = (caseItem) => {
    setDetailCase(caseItem);
    handleResetZoom();
  };

  const handleCloseDetailModal = () => {
    setDetailCase(null);
    handleResetZoom();
  };

  // Manejo de modal de gestión de actividad
  const handleAbrirActividad = (act) => {
    setActividadModal(act);
    setOpcionTemporal(act.opcionSeleccionada || '');
    setOtraOpcionTexto('');
    setJustificacionTemporal(act.justificacion || '');
  };

  const handleGuardarGestion = async () => {
    if (!actividadModal) return;

    if (!opcionTemporal) {
      alert('Por favor selecciona una opción de actuación del catálogo legal del cargo.');
      return;
    }

    let decisionFinal = opcionTemporal;
    if (opcionTemporal.includes('11. Otra')) {
      if (!otraOpcionTexto.trim()) {
        alert('Por favor especifique la actuación operativa que llevará a cabo.');
        return;
      }
      decisionFinal = `11. Otra decisión: ${otraOpcionTexto.trim()}`;
    }

    if (!justificacionTemporal.trim()) {
      alert('Por favor escribe la justificación o argumento de tu decisión. Este texto es obligatorio para el informe PDF.');
      return;
    }

    setGuardandoGestion(true);
    const isIgnorada = opcionTemporal.includes('10. Ignorar');
    const nuevoEstado = isIgnorada ? 'IGNORADA' : 'REALIZADA';

    // 1. Actualizar estado local
    setActividades((prev) =>
      prev.map((a) => {
        if (a.id === actividadModal.id) {
          return {
            ...a,
            estado: nuevoEstado,
            opcionSeleccionada: decisionFinal,
            justificacion: justificacionTemporal.trim()
          };
        }
        return a;
      })
    );

    // 2. Si es delegada, sincronizar con backend
    if (actividadModal.esDelegadaPorFiscal || usuario?.equipo_id) {
      try {
        await axios.post(
          `${API_URL}/equipos/${encodeURIComponent(equipoId)}/alertas/${actividadModal.id}/resolver`,
          {
            estado: nuevoEstado,
            opcionSeleccionada: decisionFinal,
            justificacion: justificacionTemporal.trim(),
            resueltoPor: usuario?.nombre || 'Asistente de Fiscal'
          },
          { headers: authHeaders }
        );
      } catch (err) {
        console.warn('Error resolviendo alerta en backend:', err);
      }
    }

    setGuardandoGestion(false);
    setActividadModal(null);
  };

  // Generador de informe en PDF
  const handleDescargarInforme = () => {
    const doc = new jsPDF();
    let y = 20;

    const writeLine = (text, size = 11, color = [30, 41, 59], style = 'normal') => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.setFont('helvetica', style);
      const lines = doc.splitTextToSize(String(text), 180);
      lines.forEach((line) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6.5;
      });
    };

    writeLine('INFORME TÉCNICO DE GESTIÓN OPERATIVA - ASISTENTE FISCAL', 15, [15, 23, 42], 'bold');
    writeLine('Dirección de Altos Estudios - Fiscalía General de la Nación', 10, [100, 116, 139], 'italic');
    y += 3;

    writeLine(`Asistente: ${usuario?.nombre || 'Asistente de Fiscal'}`);
    writeLine(`Equipo de trabajo: ${equipoInfo.nombre} [${equipoInfo.codigo}]`);
    try {
      const savedMembers = localStorage.getItem(`nexus_team_members_${usuario?.id}`);
      if (savedMembers) {
        const parsed = JSON.parse(savedMembers).filter((n) => n.trim() !== '');
        if (parsed.length > 0) {
          writeLine(`Integrantes del grupo: ${parsed.join(', ')}`);
        }
      }
    } catch (err) {
      console.error('Error rendering team members in assistant PDF:', err);
    }
    if (equipoInfo.integrantes.length > 0) {
      const integrantesStr = equipoInfo.integrantes.map((i) => `${i.nombreCompleto || i.nombre} (${i.rol})`).join(' | ');
      writeLine(`Integrantes del Grupo: ${integrantesStr}`);
    }
    writeLine(`Fecha de emisión: ${new Date().toLocaleString()}`);
    writeLine(`Tiempo restante registrado: ${formatTime(timeLeft)}`);
    y += 4;

    // SECCIÓN 1: PROPUESTAS DE ASOCIACIÓN (FASE 1)
    writeLine('1. FASE 1: PROPUESTAS DE ASOCIACIÓN PRESENTADAS AL FISCAL', 12, [15, 23, 42], 'bold');
    y += 1;
    if (createdGroups.length === 0) {
      writeLine('No se registraron propuestas de asociación durante la sesión.', 10, [100, 116, 139]);
    } else {
      createdGroups.forEach((grp, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        const radicados = (grp.caseIds || [])
          .map((id) => {
            const c = carpetas.find((item) => item.id === id);
            return c ? c.nombre.replace('Caso ', '') : id;
          })
          .join(', ');
        writeLine(`${idx + 1}. ${grp.name} — Patrón / Fenómeno: ${grp.asociarPor || 'Patrón criminal'}`, 11, [13, 148, 136], 'bold');
        writeLine(`   Noticias criminales vinculadas (Radicados): [ ${radicados} ]`, 10, [51, 65, 85]);
        if (grp.sugerenciaActuacion) {
          writeLine(`   Acción sugerida desde el rol de Asistente: ${grp.sugerenciaActuacion}`, 10, [30, 58, 138], 'bold');
        }
        writeLine(`   Justificación técnica de la asociación: ${grp.justificacion || 'Sin justificación'}`, 10, [51, 65, 85]);
        y += 2;
      });
    }
    y += 4;

    // SECCIÓN 2: FASE 2 - PRIORIZACIÓN DE LA GESTIÓN DE LAS ÓRDENES A SU CARGO
    writeLine('2. FASE 2: PRIORIZACIÓN DE LA GESTIÓN DE LAS ÓRDENES A SU CARGO (7 ÓRDENES PJ)', 12, [15, 23, 42], 'bold');
    y += 1;
    if (propuestaPriorizacionOrdenes.trim() || justificacionPriorizacionOrdenes.trim()) {
      writeLine(`   Propuesta de priorización: ${propuestaPriorizacionOrdenes.trim() || 'No especificada'}`, 10, [30, 58, 138], 'bold');
      writeLine(`   Justificación técnica: ${justificacionPriorizacionOrdenes.trim() || 'No especificada'}`, 10, [51, 65, 85]);
    } else {
      writeLine('No se registró propuesta de priorización de las 7 órdenes a policía judicial.', 10, [100, 116, 139]);
    }
    y += 4;

    const totalActividades = actividades.length;
    const atendidas = actividades.filter((a) => a.estado === 'REALIZADA' || a.estado === 'RESUELTA').length;
    const ignoradas = actividades.filter((a) => a.estado === 'IGNORADA').length;
    const pendientes = actividades.filter((a) => a.estado === 'PENDIENTE').length;

    writeLine('3. BALANCE DE GESTIÓN Y ALERTAS DEL DESPACHO', 12, [15, 23, 42], 'bold');
    writeLine(`Total de actividades recibidas: ${totalActividades}`);
    writeLine(`Actividades atendidas / tramitadas: ${atendidas}`);
    writeLine(`Actividades ignoradas / descartadas: ${ignoradas}`);
    writeLine(`Actividades pendientes por resolver: ${pendientes}`);
    y += 5;

    writeLine('4. REGISTRO DETALLADO DE ACTUACIONES Y JUSTIFICACIONES', 12, [15, 23, 42], 'bold');
    y += 2;

    actividades.forEach((act, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      writeLine(`${idx + 1}. [${act.estado}] ${act.titulo}`, 11, [30, 58, 138], 'bold');
      if (act.radicado || act.delito) {
        writeLine(`   Expediente / NUNC: ${act.radicado || 'Sin radicado'} | Delito: ${act.delito || 'Sin delito'}`, 10, [71, 85, 105], 'italic');
      }
      if (act.esDelegadaPorFiscal) {
        writeLine(`   [ORIGEN: Diligencia trasladada por el Fiscal Delegado: ${act.delegadoPor}]`, 10, [2, 132, 199]);
      }
      if (act.opcionSeleccionada) {
        writeLine(`   Decisión / Actuación: ${act.opcionSeleccionada}`, 10, [15, 118, 110], 'bold');
      }
      if (act.justificacion) {
        writeLine(`   Justificación: ${act.justificacion}`, 10, [51, 65, 85]);
      } else {
        writeLine(`   Estado: Sin resolución registrada.`, 10, [148, 163, 184]);
      }
      y += 3;
    });

    const safeName = (usuario?.nombre || 'asistente').replace(/\s+/g, '-').toLowerCase();
    doc.save(`informe-operativo-${safeName}.pdf`);
  };

  // Extraer lista única de delitos para el dropdown de filtro
  const uniqueDelitos = useMemo(() => {
    const set = new Set();
    carpetas.forEach((c) => {
      if (c.tipo_delito) set.add(c.tipo_delito.trim().toUpperCase());
    });
    return ['Todos', ...Array.from(set)];
  }, [carpetas]);

  // Filtrar casos por término de búsqueda y delito
  const filteredCarpetas = useMemo(() => {
    return carpetas.filter((c) => {
      const radicado = c.nombre ? c.nombre.replace('Caso ', '') : '';
      const matchesSearch =
        radicado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tipo_delito && c.tipo_delito.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDelito =
        selectedDelito === 'Todos' ||
        (c.tipo_delito && c.tipo_delito.trim().toUpperCase() === selectedDelito.toUpperCase());

      return matchesSearch && matchesDelito;
    });
  }, [carpetas, searchTerm, selectedDelito]);

  const pendientesCount = actividades.filter((a) => a.estado === 'PENDIENTE').length;
  const delegadasCount = actividades.filter((a) => a.esDelegadaPorFiscal && a.estado === 'PENDIENTE').length;

  return (
    <div 
      className="min-h-screen text-slate-100 flex flex-col font-sans select-none relative bg-slate-950"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(6, 10, 15, 0.50) 0%, rgba(6, 10, 15, 0.70) 100%), url('/assets/fondo-asistente.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 1. TOP BAR INSTITUCIONAL */}
      <header className="border-b border-cyan-500/20 bg-[#0c1322]/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between gap-4 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-mono font-black text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            DAE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest text-cyan-400 uppercase">SISTEMA NEXUS</span>
              <span className="text-[10px] bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold">
                ASISTENTE DE FISCAL
              </span>
            </div>
            <p className="font-mono text-sm font-bold text-slate-200">
              {usuario?.nombre || 'Asistente de Despacho'} • <span className="text-slate-400 font-normal">{equipoInfo.nombre} ({equipoInfo.codigo})</span>
            </p>
          </div>
        </div>

        {/* CLOCK & ACTIONS */}
        <div className="flex items-center gap-3">
          {/* Botón de Inducción / Info */}
          <button
            type="button"
            onClick={() => {
              setCurrentStep(1);
              setShowInstructions(true);
            }}
            title="Ver inducción e instrucciones del entorno"
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 px-3 py-2 text-xs font-mono font-bold text-cyan-300 transition-all shadow-sm"
          >
            <FiInfo size={14} />
            <span className="hidden md:inline">Inducción</span>
          </button>

          {/* Subtle Floating Penalty Animation */}
          {lastPenaltyAnim && (
            <div className="animate-bounce flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/80 text-amber-300 px-3 py-1 rounded-lg text-xs font-mono font-black shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <FiClock size={13} />
              <span>−{lastPenaltyAnim.minutes || 5} min aplicados ({lastPenaltyAnim.reason || 'Decisión'})</span>
            </div>
          )}

          {/* TIMER */}
          <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-rose-950/80 px-4 py-2 border border-red-500/40 shadow-[0_0_20px_rgba(220,38,38,0.25)] font-mono">
            <FiClock className="text-red-400 animate-pulse" size={17} />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-red-300 font-bold leading-none">Tiempo Restante</span>
              <span className="text-lg font-black tracking-widest text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* DESCARGAR INFORME */}
          <button
            type="button"
            onClick={handleDescargarInforme}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-900/60 px-4 py-2 text-xs font-mono font-bold text-emerald-300 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95"
          >
            <FiFileText size={15} />
            <span className="hidden sm:inline">DESCARGAR INFORME (PDF)</span>
          </button>

          {/* SALIR */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('usuario');
              window.location.reload();
            }}
            title="Cerrar sesión"
            className="rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-red-950/50 hover:border-red-500/50 p-2.5 text-slate-400 hover:text-red-300 transition-all"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </header>

      {/* TOAST FLOTANTE CUANDO EL FISCAL DELEGA ALGO */}
      {notificacionDelegada && (
        <div className="fixed top-20 right-6 z-50 animate-bounce flex items-start gap-3 rounded-2xl border-2 border-cyan-400 bg-[#061426] p-4 shadow-[0_0_40px_rgba(6,182,212,0.6)] max-w-md">
          <div className="rounded-xl bg-cyan-500/20 p-2.5 text-cyan-300 shrink-0">
            <FiInbox size={22} />
          </div>
          <div className="flex-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">NUEVA ALERTA DELEGADA</span>
              <span className="text-[10px] text-slate-400">Ahora</span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-0.5">{notificacionDelegada.titulo}</p>
            <p className="text-xs text-slate-300 mt-1">
              El {notificacionDelegada.delegadoPor} le ha transferido esta actuación para decisión operativa.
            </p>
          </div>
        </div>
      )}

      {/* 2. MAIN LAYOUT: MÓDULO DE CASOS + PROPUESTAS DE ASOCIACIÓN + ACTIVIDADES */}
      <main className="p-6 flex-1 flex flex-col space-y-6 max-w-full mx-auto w-full">
        {/* Banner de Inspección */}
        <div className="flex flex-wrap items-center justify-between rounded-xl border border-cyan-500/30 bg-slate-950/80 px-6 py-3.5 backdrop-blur-md shadow-xl gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400 font-mono font-bold">MÓDULO DE CASOS • FASE 1: REVISIÓN Y PROPUESTA DE ASOCIACIÓN</p>
            <h1 className="mt-0.5 font-mono text-xl font-bold tracking-[0.15em] text-slate-100">Procesos del despacho</h1>
          </div>
          <p className="text-xs text-slate-300 font-mono uppercase tracking-wider bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-cyan-500/30">
            SELECCIONE CASOS PARA PRESENTAR PROPUESTAS DE ASOCIACIÓN SEGÚN PATRONES Y FENÓMENOS CRIMINALES
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-xl border border-cyan-500/20 shadow-md backdrop-blur-md">
          <div className="relative md:col-span-2">
            <FiSearch className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar caso por número de radicado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-500/30 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all font-mono"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <select
              value={selectedDelito}
              onChange={(e) => setSelectedDelito(e.target.value)}
              className="w-full rounded-lg border border-slate-500/30 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 appearance-none capitalize transition-all font-mono"
            >
              {uniqueDelitos.map((delito) => (
                <option key={delito} value={delito} className="bg-slate-950 text-slate-200 capitalize">
                  {delito === 'Todos' ? 'Todos los delitos' : delito}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra Flotante de Acciones de Propuesta de Asociación */}
        {selectedCaseIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/90 border border-cyan-500/40 p-4 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.2)] backdrop-blur-md animate-welcome-zoom">
            <span className="font-mono text-xs font-bold text-cyan-300">
              ⚡ {selectedCaseIds.length} noticia(s) criminal(es) seleccionada(s):
            </span>
            {selectedCaseIds.length >= 2 && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="rounded-lg bg-cyan-600 px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-950/40 flex items-center gap-1.5"
              >
                <FiLink size={14} />
                <span>Crear propuesta de asociación</span>
              </button>
            )}
            {selectedCaseIds.length >= 1 && createdGroups.length > 0 && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-indigo-500 shadow-md shadow-indigo-950/40 flex items-center gap-1.5"
              >
                <FiPlus size={14} />
                <span>Agregar a propuesta existente</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedCaseIds([])}
              className="text-xs font-mono text-slate-400 hover:text-white underline transition"
            >
              Cancelar selección
            </button>
            {createdGroups.length > 0 && (
              <button
                type="button"
                onClick={handleResetGroups}
                className="ml-auto rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-300 transition hover:bg-red-500/20 hover:text-white"
              >
                Deshacer propuestas
              </button>
            )}
          </div>
        )}

        {/* Contenedor Dividido: Grid de Casos (Izquierda) + Propuestas y Actividades (Derecha) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: GRID DE EXPEDIENTES (3 COLUMNAS) */}
          <div className="xl:col-span-3">
            {loadingCases ? (
              <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-12 text-center text-sm font-mono text-cyan-300">
                Cargando expedientes del despacho...
              </div>
            ) : filteredCarpetas.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-12 text-center">
                <FiFolder className="mx-auto text-slate-500 mb-3" size={40} />
                <p className="font-mono text-sm text-slate-400">No se encontraron expedientes con los criterios seleccionados.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCarpetas.map((caseItem) => {
                  const radicado = caseItem.nombre ? caseItem.nombre.replace('Caso ', '') : '';
                  const delito = caseItem.tipo_delito || 'DELITO NO ESPECIFICADO';
                  const cardGroup = createdGroups.find((g) => (g.caseIds || []).includes(caseItem.id));
                  const cardColorStyle = cardGroup
                    ? cardGroup.color
                    : 'border-slate-800 bg-slate-950/80 hover:border-cyan-500/50';

                  return (
                    <div
                      key={caseItem.id}
                      className={`group rounded-xl border overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between backdrop-blur-md ${cardColorStyle}`}
                    >
                      {/* Miniatura del Folio */}
                      <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
                        {caseItem.imagen_url ? (
                          <img
                            src={caseItem.imagen_url}
                            alt={caseItem.nombre}
                            loading="lazy"
                            onClick={() => handleOpenDetailModal(caseItem)}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                          />
                        ) : (
                          <div
                            onClick={() => handleOpenDetailModal(caseItem)}
                            className="flex h-full w-full items-center justify-center text-slate-600 cursor-pointer"
                          >
                            <FiFolder size={48} />
                          </div>
                        )}

                        {/* Checkbox Superior Izquierdo para Propuesta de Asociación */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-3 left-3 z-10 bg-slate-950/85 p-1.5 rounded-lg border border-slate-700/60 backdrop-blur-sm transition-all"
                          title={cardGroup ? `Ya pertenece a ${cardGroup.name}` : 'Seleccionar para propuesta de asociación'}
                        >
                          <input
                            type="checkbox"
                            disabled={Boolean(cardGroup)}
                            checked={selectedCaseIds.includes(caseItem.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCaseIds([...selectedCaseIds, caseItem.id]);
                              } else {
                                setSelectedCaseIds(selectedCaseIds.filter((id) => id !== caseItem.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          />
                        </div>

                        {/* Insignia de Propuesta si pertenece a una */}
                        {cardGroup && (
                          <span className="absolute top-3 right-3 z-10 rounded-md bg-cyan-950/95 border border-cyan-400 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300 backdrop-blur-sm shadow-md">
                            {cardGroup.name}
                          </span>
                        )}

                        <div
                          onClick={() => handleOpenDetailModal(caseItem)}
                          className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none"
                        >
                          <span className="rounded-lg bg-slate-950/80 border border-cyan-400/50 px-3 py-1 font-mono text-xs font-bold text-cyan-300">
                            🔍 Ampliar Folio
                          </span>
                        </div>
                      </div>

                      {/* Contenido de la Tarjeta */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="font-mono text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            Radicado: {radicado}
                          </h3>
                          <p className="mt-1.5 text-xs text-cyan-300/90 font-mono capitalize flex items-center gap-1.5">
                            <FiAlertTriangle size={13} className="text-amber-400 shrink-0" />
                            <span>Delito: {delito}</span>
                          </p>
                        </div>

                        {/* Botón Ver detalles */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(caseItem)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 py-2.5 font-mono text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20 hover:text-white active:scale-98"
                        >
                          <FiEye size={14} />
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* =========================================================================
                FASE 2: PRIORIZACIÓN DE LA GESTIÓN DE LAS ÓRDENES A SU CARGO (DEBAJO DE CASOS)
               ========================================================================= */}
            <div className="mt-8 rounded-2xl border border-amber-500/40 bg-slate-950/90 p-6 shadow-[0_0_30px_rgba(245,158,11,0.12)] backdrop-blur-md space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300 uppercase">
                      Fase 2
                    </span>
                    <h2 className="font-mono text-base md:text-lg font-bold text-amber-200 tracking-wide">
                      • Priorización de la gestión de las órdenes a su cargo
                    </h2>
                  </div>
                  <p className="text-xs md:text-sm text-slate-200 leading-relaxed max-w-4xl">
                    El Fiscal titular del Despacho emite 7 órdenes a policía judicial con un término de veinte (20) días, usted deberá revisar la totalidad de órdenes a su cargo, en el marco del cumplimiento de las funciones transitorias como policía judicial, y presentar la propuesta de priorización para la ejecución de estas con su respectiva justificación.
                  </p>
                </div>

                {/* Enlace de descarga de las 7 órdenes */}
                <button
                  type="button"
                  onClick={handleDescargarTodasLasOrdenes}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 px-4 py-2.5 font-mono text-xs font-bold text-amber-200 transition shadow-lg shrink-0 cursor-pointer"
                >
                  <FiFileText size={16} className="text-amber-300" />
                  <span className="underline">Puede descargar las órdenes en el siguiente enlace (Descargar las 7 órdenes PDF)</span>
                </button>
              </div>

              {/* Listado interactivo de las 7 órdenes en PDF para abrir o descargar */}
              {mostrarListaOrdenesPj && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                      📂 7 Órdenes a Policía Judicial emitidas (Término: 20 días):
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Haz clic en &quot;Ver PDF&quot; para abrir en pestaña nueva o &quot;Descargar&quot;
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {ORDENES_PJ_FASE2.map((orden, idx) => {
                      const pdfUrl = `/ordenes/${encodeURIComponent(orden.archivo)}`;
                      return (
                        <div
                          key={orden.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-700/80 bg-slate-950/90 p-3 hover:border-amber-500/50 transition gap-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 shrink-0">
                              #{idx + 1}
                            </span>
                            <p className="font-mono text-xs font-semibold text-slate-100 leading-snug">
                              {orden.titulo}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1.5 font-mono text-[11px] font-bold text-cyan-300 transition"
                            >
                              🔍 Ver PDF
                            </a>
                            <a
                              href={pdfUrl}
                              download={orden.archivo}
                              className="flex-1 text-center rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 font-mono text-[11px] font-bold text-amber-300 transition"
                            >
                              ⬇ Descargar
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Formulario interactivo para ordenar de 1 a 7 arrastrando y justificar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                      Propuesta de priorización (Arrastre de mayor a menor prioridad):
                    </label>
                    <span className="font-mono text-[10px] text-slate-400">
                      1° Mayor → 7° Menor
                    </span>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex-1">
                    {ordenPriorizadaList.map((orden, idx) => {
                      const isDragging = draggedOrdenIdx === idx;
                      const isDragOver = dragOverOrdenIdx === idx;
                      return (
                        <div
                          key={orden.id}
                          draggable
                          onDragStart={() => setDraggedOrdenIdx(idx)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverOrdenIdx !== idx) setDragOverOrdenIdx(idx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedOrdenIdx !== null && draggedOrdenIdx !== idx) {
                              handleMoveOrdenPrioridad(draggedOrdenIdx, idx);
                            }
                            setDraggedOrdenIdx(null);
                            setDragOverOrdenIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedOrdenIdx(null);
                            setDragOverOrdenIdx(null);
                          }}
                          className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 font-mono text-xs cursor-grab active:cursor-grabbing select-none transition-all ${
                            isDragging
                              ? 'opacity-50 border-amber-400 bg-amber-950/40 scale-[0.98]'
                              : isDragOver
                              ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'border-slate-700/80 bg-slate-950/90 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Indicador de Puesto de Prioridad (1° a 7°) */}
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-black shrink-0 ${
                                idx === 0
                                  ? 'bg-red-500/25 border border-red-400/60 text-red-300'
                                  : idx < 3
                                  ? 'bg-amber-500/25 border border-amber-400/60 text-amber-300'
                                  : 'bg-slate-800 border border-slate-600 text-slate-300'
                              }`}
                            >
                              {idx + 1}°
                            </span>

                            {/* Rectangulito con el número original de la orden (#1 a #7) */}
                            <span className="rounded bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-[11px] font-black text-amber-200 shrink-0 shadow-sm">
                              #{orden.indice}
                            </span>

                            <span className="text-slate-100 font-semibold truncate">
                              {orden.titulo}
                            </span>
                          </div>

                          {/* Controles rápidos subir/bajar e ícono de arrastre */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveOrdenPrioridad(idx, idx - 1)}
                              title="Subir prioridad"
                              className="rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === ordenPriorizadaList.length - 1}
                              onClick={() => handleMoveOrdenPrioridad(idx, idx + 1)}
                              title="Bajar prioridad"
                              className="rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <span className="text-slate-500 pl-1 text-sm" title="Arrastrar para reordenar">
                              ⋮⋮
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Vista previa compacta del orden actual */}
                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                      <span>Orden seleccionado (Mayor a menor):</span>
                      <span className="font-bold text-amber-300">
                        {ordenPriorizadaList.map((o) => `#${o.indice}`).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                    Justificación de la propuesta de priorización:
                  </label>
                  <textarea
                    rows={10}
                    value={justificacionPriorizacionOrdenes}
                    onChange={(e) => setJustificacionPriorizacionOrdenes(e.target.value)}
                    placeholder="Explique la justificación técnica, jurídica e investigativa (en el marco de funciones transitorias de policía judicial) del orden de prioridad establecido..."
                    className="w-full flex-1 rounded-xl border border-slate-700 bg-slate-900/90 p-3.5 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 font-mono resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  {priorizacionGuardadaMsg && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                      <FiCheckCircle size={14} /> Propuesta de priorización guardada para el informe PDF.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGuardarFase2Priorizacion}
                  className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-6 py-2.5 font-mono text-xs font-bold text-white shadow-lg transition active:scale-95"
                >
                  Guardar Propuesta de Priorización (Fase 2)
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PROPUESTAS DE ASOCIACIÓN (FASE 1) + ACTIVIDADES DEL DESPACHO */}
          <aside className="xl:col-span-1 flex flex-col space-y-6 sticky top-24">
            {/* PANEL 1: PROPUESTAS DE ASOCIACIÓN DEL ASISTENTE */}
            <div className="bg-slate-950/85 p-5 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl flex flex-col space-y-4 max-h-[42vh] overflow-y-auto">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <FiLink size={14} className="text-cyan-400" />
                    Propuestas de Asociación
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Fase 1 • Sugerencias para el Fiscal
                  </p>
                </div>
                <span className="rounded-full bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  {createdGroups.length}
                </span>
              </div>

              {createdGroups.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-500 font-mono leading-relaxed">
                  No hay propuestas creadas. Selecciona 2 o más noticias criminales con el recuadro superior izquierdo para proponer su asociación.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {createdGroups.map((group) => {
                    const isExpanded = expandedGroupIds.includes(group.id);
                    const isEditing = editingGroupId === group.id;

                    return (
                      <div key={group.id} className="font-mono text-xs rounded-xl border border-slate-800/90 bg-slate-900/40 p-2.5">
                        {isEditing ? (
                          <div
                            className="w-full flex items-center gap-1.5 p-1 bg-slate-900 border border-cyan-500/30 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveGroupName(group.id);
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              className="flex-1 bg-slate-950 px-2 py-1 rounded text-xs text-slate-100 outline-none border border-slate-800 focus:border-cyan-400 font-bold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveGroupName(group.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                              title="Guardar"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGroupId(null)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                              title="Cancelar"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => toggleGroupExpand(group.id)}
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 text-slate-200 cursor-pointer transition-colors group/folder"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FiFolder className={isExpanded ? 'text-cyan-400' : 'text-amber-400'} size={14} />
                              <span className="font-bold truncate">{group.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroupId(group.id);
                                  setEditGroupName(group.name);
                                }}
                                title="Editar nombre de propuesta"
                                className="p-0.5 hover:bg-slate-800 hover:text-cyan-400 rounded transition ml-1 shrink-0 opacity-0 group-hover/folder:opacity-100 text-[10px]"
                              >
                                ✎
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {isExpanded ? '▼' : '▶'} ({(group.caseIds || []).length})
                            </span>
                          </div>
                        )}

                        {/* Detalle de la Propuesta del Asistente (Sin botón de decisiones de Fiscal) */}
                        {isExpanded && !isEditing && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
                            <div className="rounded-lg bg-slate-950/80 border border-cyan-500/20 p-2 text-[10px] space-y-1">
                              <div>
                                <span className="text-cyan-400 font-bold">Patrón / Fenómeno: </span>
                                <span className="text-slate-200">{group.asociarPor || 'Patrón criminal'}</span>
                              </div>
                              {group.sugerenciaActuacion && (
                                <div>
                                  <span className="text-amber-300 font-bold">Sugerencia del Asistente: </span>
                                  <span className="text-slate-200">{group.sugerenciaActuacion}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-400 font-bold">Justificación: </span>
                                <p className="text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed">
                                  {group.justificacion || 'Sin justificación'}
                                </p>
                              </div>
                            </div>

                            <div className="ml-2 pl-2 border-l border-slate-800 space-y-1">
                              {(group.caseIds || []).map((caseId) => {
                                const c = carpetas.find((item) => item.id === caseId);
                                if (!c) return null;
                                return (
                                  <div
                                    key={caseId}
                                    className="flex items-center justify-between p-1 rounded hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition group/item"
                                  >
                                    <span className="flex items-center gap-1.5 truncate text-[11px]">
                                      <FiFileText size={11} className="text-cyan-400 shrink-0" />
                                      <span className="truncate">Rad: {c.nombre.replace('Caso ', '')}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromGroup(group.id, caseId);
                                      }}
                                      title="Retirar de la propuesta"
                                      className="p-0.5 hover:bg-red-500/10 hover:text-red-400 rounded transition opacity-0 group-hover/item:opacity-100"
                                    >
                                      <FiX size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL 2: ACTIVIDADES Y ÓRDENES A SU CARGO */}
            <div className="bg-slate-950/85 p-5 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl flex flex-col space-y-4 max-h-[52vh] overflow-hidden">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <FiAlertCircle size={15} className="text-amber-400" />
                    Órdenes y Actividades a Cargo
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {pendientesCount} pendientes de resolución
                  </p>
                </div>
                <span className="rounded-full bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  {actividades.length} Total
                </span>
              </div>

              {/* Lista de Actividades */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {actividades.map((act) => {
                  const isRealizada = act.estado === 'REALIZADA' || act.estado === 'RESUELTA';
                  const isIgnorada = act.estado === 'IGNORADA';

                  return (
                    <div
                      key={act.id}
                      onClick={() => handleAbrirActividad(act)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
                        act.esDelegadaPorFiscal
                          ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-950/60 to-slate-900/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'border-slate-800 bg-[#070e1a]/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {act.esDelegadaPorFiscal && (
                            <span className="rounded bg-cyan-500/20 border border-cyan-400/60 px-1.5 py-0.5 text-[8px] font-mono font-black text-cyan-300">
                              DELEGADA POR FISCAL
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[8px] font-mono font-bold ${
                              isRealizada
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                : isIgnorada
                                ? 'bg-slate-700/40 border border-slate-600 text-slate-400'
                                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse'
                            }`}
                          >
                            {act.estado}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{act.id}</span>
                      </div>

                      <h4 className="font-mono text-xs font-bold text-slate-100 mt-2 line-clamp-2">{act.titulo}</h4>

                      {act.radicado && (
                        <p className="text-[10px] font-mono text-cyan-400/90 mt-1 truncate">
                          Rad: {act.radicado} {act.delito ? `• ${act.delito}` : ''}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {act.descripcion}
                      </p>

                      {act.opcionSeleccionada && (
                        <div className="mt-2 rounded border border-slate-800 bg-[#03060c] p-1.5 text-[10px] font-mono text-emerald-300">
                          <span className="text-slate-500 font-bold">Decisión: </span>
                          <span className="truncate block">{act.opcionSeleccionada}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL PRESENTAR PROPUESTA DE ASOCIACIÓN (ROL ASISTENTE DE FISCAL) */}
      {isJustifyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 py-8 backdrop-blur-sm animate-welcome-zoom">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                Fase 1 • Rol Asistente de Fiscal
              </span>
            </div>
            <h3 className="font-mono text-base font-bold text-slate-100 uppercase tracking-wider mt-1">
              {justifyMode === 'create' ? 'Presentar Propuesta de Asociación' : 'Anexar Casos a Propuesta de Asociación'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-5 font-mono leading-relaxed">
              Desde su rol de asistente de fiscal, presente al Fiscal Delegado la propuesta de asociación identificando patrones y fenómenos criminales con su respectiva justificación técnica.
            </p>

            <div className="space-y-4">
              {justifyMode === 'add' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                    Propuesta de destino:
                  </label>
                  <select
                    value={selectedTargetGroupId}
                    onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400 font-mono transition-all"
                  >
                    {createdGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5 font-mono">
                  1. Patrón o fenómeno criminal identificado:
                </label>
                <select
                  value={asociarPor}
                  onChange={(e) => setAsociarPor(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400 font-mono transition-all"
                >
                  <option value="Patrón criminal">Patrón criminal</option>
                  <option value="Fenómeno criminal">Fenómeno criminal</option>
                  <option value="Modus operandi">Modus operandi</option>
                  <option value="Modalidad delictiva">Modalidad delictiva</option>
                  <option value="Criterio de conexidad">Criterio de conexidad</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5 font-mono">
                  2. Sugerencia de actuación desde su rol de Asistente:
                </label>
                <input
                  type="text"
                  value={sugerenciaActuacion}
                  onChange={(e) => setSugerenciaActuacion(e.target.value)}
                  placeholder="Ej: Sugerir al Fiscal conexidad procesal y proyectar orden conjunta a Policía Judicial..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400 font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5 font-mono">
                  3. Justificación de la propuesta de asociación:
                </label>
                <textarea
                  value={justificacionText}
                  onChange={(e) => setJustificacionText(e.target.value)}
                  placeholder="Explique por qué considera que estas noticias criminales deben asociarse según los patrones, sujetos, zonas o fenómenos criminales identificados..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400 resize-none font-mono transition-all leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsJustifyModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-300 transition shadow-md font-mono"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmJustification}
                className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 px-5 py-2.5 text-xs font-bold text-cyan-200 transition shadow-lg shadow-cyan-950/30 font-mono"
              >
                Guardar Propuesta de Asociación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL DE VISUALIZACIÓN / LIGHTBOX A PANTALLA COMPLETA CON ZOOM Y PAN */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-2 sm:p-4">
          <div className="relative w-full h-[96vh] rounded-2xl border-2 border-cyan-500/40 bg-[#060b14] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="border-b border-cyan-500/20 bg-[#0a1120] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2 text-cyan-400">
                  <FiFolder size={18} />
                </div>
                <div>
                  <h3 className="font-mono text-sm md:text-base font-bold text-slate-100">
                    Expediente: {detailCase.nombre.replace('Caso ', '')}
                  </h3>
                  <p className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Delito: {detailCase.tipo_delito || 'No especificado'}
                  </p>
                </div>
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Controles flotantes + Área de zoom & pan */}
            <div className="flex-1 bg-slate-950 flex flex-col relative overflow-hidden">
              {/* Controles Flotantes de Zoom */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1.5 border border-slate-700/80 backdrop-blur-md shadow-2xl">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Acercar (+)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                >
                  <FiPlus size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Alejar (-)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                >
                  <FiMinus size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Restablecer tamaño (1:1)"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold transition"
                >
                  1:1
                </button>
                <span className="px-2 font-mono text-xs font-bold text-slate-300">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Visor Interactivo Pan & Drag */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onWheel={handleWheel}
                className="flex-1 overflow-hidden relative flex items-center justify-center select-none p-4"
              >
                {detailCase.imagen_url ? (
                  <img
                    src={detailCase.imagen_url}
                    alt={detailCase.nombre}
                    draggable={false}
                    className="max-h-[82vh] max-w-full object-contain transition-transform duration-75 origin-center"
                    style={{
                      transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                      cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-500 font-mono">Este caso no tiene folio digital asignado.</p>
                )}
              </div>

              {/* Barra Inferior del Visor */}
              <div className="bg-[#080e1a] px-4 py-2 border-t border-slate-900 text-center text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>{zoomScale > 1 ? '🖱️ Haz clic y arrastra con el ratón para desplazarte por el folio' : '🔍 Usa los botones de la esquina o la rueda del ratón para hacer zoom'}</span>
                <span className="text-cyan-400">Escala: {Math.round(zoomScale * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE LAS 5 ALERTAS DE DESPACHO (5 MIN EN PANTALLA, ALERTA 1 RECURRENTE CADA 15 MIN) */}
      {alertaDespachoActiva && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-slate-950/95 backdrop-blur-md">
          <div className="relative w-full max-w-5xl rounded-3xl border-2 border-red-500/80 bg-gradient-to-b from-[#180505] via-[#0b101d] to-[#050912] p-6 md:p-8 shadow-[0_0_90px_rgba(239,68,68,0.5)] flex flex-col max-h-[94vh] overflow-y-auto">
            {/* Header de Alerta */}
            <div className="border-b border-red-500/30 pb-4 mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-md bg-red-950 border border-red-500/60 px-2.5 py-1 text-xs font-mono font-black text-red-300 animate-pulse uppercase">
                    🚨 ALERTA #{alertaDespachoActiva.numero || ''} DE DESPACHO
                  </span>
                  {alertaDespachoActiva.esRecurrente && (
                    <span className="rounded-md bg-amber-950/80 border border-amber-500/50 px-2.5 py-1 text-xs font-mono font-bold text-amber-300">
                      RECURRENTE CADA 15 MIN
                    </span>
                  )}
                  <span className="rounded-md bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs font-mono text-cyan-300">
                    ASISTENTE DE FISCAL
                  </span>
                </div>

                {/* Si es Alerta 5 (Tutela), el título "CORREO ELECTRÓNICO" se muestra en rojo */}
                <h3
                  className={`font-mono text-xl md:text-2xl font-black mt-2 ${
                    alertaDespachoActiva.tipoFlujo === 'tutela'
                      ? 'text-red-500 tracking-wider uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                      : 'text-slate-100'
                  }`}
                >
                  {alertaDespachoActiva.titulo}
                </h3>

                {alertaDespachoActiva.pendientesTexto && (
                  <p className="text-xs md:text-sm font-mono font-bold text-amber-300 mt-1.5 bg-amber-950/40 border border-amber-500/40 rounded-lg px-3 py-1.5 inline-block">
                    {alertaDespachoActiva.pendientesTexto}
                  </p>
                )}

                {alertaDespachoActiva.radicado && alertaDespachoActiva.tipoFlujo !== 'tutela' && (
                  <p className="text-xs font-mono text-cyan-400 mt-1.5">
                    Referencia: <span className="font-bold">{alertaDespachoActiva.radicado}</span> • {alertaDespachoActiva.delito}
                  </p>
                )}
              </div>

              {/* Countdown Timer de 5 Minutos */}
              <div className="inline-flex flex-col items-center bg-red-950/60 border border-red-500/70 rounded-2xl px-6 py-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] shrink-0">
                <span className="text-[10px] tracking-[0.2em] uppercase text-red-400 font-mono font-black animate-pulse">
                  TIEMPO LÍMITE (5 MIN)
                </span>
                <span className="text-3xl font-black text-red-400 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                  {Math.floor(alertaCountdown / 60).toString().padStart(2, '0')}:{Math.floor(alertaCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* =========================================================
                FLUJO 1: ALERTAS 1 Y 2 (OPCIONES DIRECTAS A, B, C, D)
               ========================================================= */}
            {alertaDespachoActiva.tipoFlujo === 'opciones' && (
              <>
                <div className="rounded-2xl border border-red-500/30 bg-[#120406]/80 p-5 mb-5 text-sm md:text-base font-mono text-slate-100 leading-relaxed">
                  {alertaDespachoActiva.descripcion}
                </div>

                <div className="space-y-3 mb-5">
                  <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-300 block">
                    Seleccione una opción para atender la situación:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(alertaDespachoActiva.opciones || []).map((op, idx) => {
                      const isSelected = opcionTemporal === op;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setOpcionTemporal(op)}
                          className={`text-left rounded-2xl border p-4 font-mono text-xs md:text-sm transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/80 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                              : 'border-slate-800/90 bg-[#070c16] text-slate-200 hover:bg-[#0d182b] hover:border-slate-700'
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                          </span>
                          <span className="leading-snug font-bold">{op}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300 block">
                    Observación o justificación de su decisión (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={justificacionTemporal}
                    onChange={(e) => setJustificacionTemporal(e.target.value)}
                    placeholder="Agregue brevemente el fundamento de su decisión para el registro del despacho..."
                    className="w-full rounded-2xl border border-slate-800 bg-[#03060d] p-3.5 text-xs md:text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 resize-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-red-500/30 pt-4">
                  <button
                    type="button"
                    onClick={handleResolverAlertaDespacho}
                    className="rounded-xl border border-red-400/50 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-8 py-2.5 font-mono text-xs md:text-sm font-bold text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:shadow-[0_0_35px_rgba(239,68,68,0.7)] transition active:scale-95"
                  >
                    Confirmar Decisión
                  </button>
                </div>
              </>
            )}

            {/* =========================================================
                FLUJO 2: ALERTAS 3 Y 4 (USUARIO EN SALA - ENFOQUE DIFERENCIAL)
               ========================================================= */}
            {alertaDespachoActiva.tipoFlujo === 'enfoque_diferencial' && (
              <>
                {alertaStep === 1 ? (
                  <div className="space-y-6 py-2">
                    <div className="rounded-2xl border border-amber-500/40 bg-slate-900/90 p-5 text-sm md:text-base font-mono text-slate-100 leading-relaxed">
                      <p className="font-bold text-amber-300 mb-2">
                        {alertaDespachoActiva.titulo}. {alertaDespachoActiva.pendientesTexto}
                      </p>
                      <p className="text-slate-300 text-sm">
                        Un usuario ha llegado a la sala de atención del despacho. ¿Qué desea hacer?
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAccionInicialAlerta('Atenderlo')}
                        className="rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-3 font-mono text-sm font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:from-cyan-500 hover:to-blue-500 transition"
                      >
                        Atenderlo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccionInicialAlerta('Ignorarlo')}
                        className="rounded-xl border border-slate-600 bg-slate-800/80 px-8 py-3 font-mono text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                      >
                        Ignorarlo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-cyan-500/40 bg-[#071120] p-5 mb-5 text-sm md:text-base font-mono text-slate-100 leading-relaxed space-y-2">
                      {alertaDespachoActiva.subtituloCaso && (
                        <span className="text-cyan-300 font-bold block uppercase tracking-wider text-xs">
                          {alertaDespachoActiva.subtituloCaso}
                        </span>
                      )}
                      <p className="text-slate-100 leading-relaxed">{alertaDespachoActiva.descripcion}</p>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-amber-300 block">
                        {alertaDespachoActiva.preguntaRespuesta || '¿Cómo le responde?'}
                      </label>
                      <textarea
                        rows={4}
                        value={justificacionTemporal}
                        onChange={(e) => setJustificacionTemporal(e.target.value)}
                        placeholder="Escriba aquí la respuesta que usted le brinda desde su rol de Asistente de Fiscal..."
                        className="w-full rounded-2xl border border-cyan-500/40 bg-[#03060d] p-4 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 resize-none font-mono leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-4 border-t border-red-500/30 pt-4">
                      <button
                        type="button"
                        onClick={handleResolverAlertaDespacho}
                        className="rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-2.5 font-mono text-xs md:text-sm font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:from-cyan-500 hover:to-blue-500 transition active:scale-95"
                      >
                        Registrar Respuesta y Resolver Alerta
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* =========================================================
                FLUJO 3: ALERTA 5 (TUTELA - CORREO ELECTRÓNICO Y OFICIO JUDICIAL)
               ========================================================= */}
            {alertaDespachoActiva.tipoFlujo === 'tutela' && (
              <>
                {alertaStep === 1 ? (
                  <div className="space-y-6 py-4">
                    <div className="rounded-2xl border border-red-500/50 bg-slate-950/90 p-6 text-center space-y-3 shadow-inner">
                      <p className="font-mono text-xl md:text-2xl font-black text-red-500 uppercase tracking-widest">
                        CORREO ELECTRÓNICO
                      </p>
                      <p className="font-mono text-sm md:text-base font-medium text-white leading-relaxed max-w-2xl mx-auto">
                        {alertaDespachoActiva.asuntoCorreo}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAccionInicialAlerta('Leer')}
                        className="rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-3 font-mono text-sm font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:from-cyan-500 hover:to-blue-500 transition"
                      >
                        Leer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccionInicialAlerta('Ignorar')}
                        className="rounded-xl border border-slate-600 bg-slate-800/80 px-8 py-3 font-mono text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Documento Oficial del Juzgado */}
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-5 mb-5 text-xs md:text-sm font-mono text-slate-200 leading-relaxed max-h-[42vh] overflow-y-auto space-y-3 shadow-inner">
                      <div className="text-center font-bold text-slate-100 border-b border-slate-800 pb-3">
                        <p>JUZGADO ONCE (11°) DE PEQUEÑAS CAUSAS Y COMPETENCIA MÚLTIPLE DE BOGOTÁ</p>
                      </div>
                      <p>Bogotá D.C. 06 de noviembre de 2026.</p>
                      <p className="font-bold text-cyan-300">Oficio No. 02265</p>
                      <div>
                        <p>Señores:</p>
                        <p className="font-semibold text-slate-100">*María Fernanda Contreras Durán- Accionante</p>
                        <p className="font-semibold text-slate-100">*Fiscalía General de la Nación - Vinculada</p>
                        <p>Ciudad.</p>
                      </div>
                      <p className="font-bold text-amber-300">
                        REF: ACCIÓN DE TUTELA interpuesta María Fernanda Contreras Durán en contra de Fiscalía 297 delegada ante Jueces del Circuito Especializados (Rad. No. 2026-00678)
                      </p>
                      <p>
                        Para efectos de su notificación, me permito remitir AUTO ADMISORIO de fecha cinco (05) de noviembre del año dos mil veintiséis (2026), proferido por este Despacho Judicial dentro del asunto de la referencia, mediante el cual se RESOLVIÓ:
                      </p>
                      <div className="pl-3 border-l-2 border-cyan-500/40 space-y-2 text-slate-300 italic">
                        <p>
                          "PRIMERO. - ADMITIR la presente acción de tutela promovida por María Fernanda Contreras Durán en contra de Fiscalía 297 delegada ante Jueces del Circuito Especializados, en el marco del proceso penal No. 540016001234202400567 por presunta vulneración al derecho de petición.
                        </p>
                        <p>
                          SEGUNDO. - VINCULAR a efectos de salvaguardar el derecho a la defensa a la Fiscalía 297 delegada ante Jueces del Circuito Especializados.
                        </p>
                        <p>
                          TERCERO. - NOTIFICAR por el medio más expedito y eficaz de la admisión de la presente acción al accionante, como a los Representantes Legales y/o quienes hagan sus veces de las entidades accionadas y vinculadas, haciéndoles saber a estas últimas que disponen del perentorio término de un (1) día siguientes al recibo de la respectiva comunicación, para ejercer sus derechos de defensa y contradicción, advirtiéndoles que podrán pronunciarse sobre el objeto de la acción y aportar las pruebas y demás documentación que sustenten sus descargos.
                        </p>
                        <p>
                          Adviértaseles que la respuesta se entiende rendida bajo la gravedad de juramento, y que la omisión a darla conlleva a tener por ciertos los hechos relatados en la tutela y resolver de plano (Art. 19 y 20 Decreto 2591 de 1991).
                        </p>
                        <p>
                          Dentro del mismo término deberán informar el nombre, cargo, dirección, teléfono y correo electrónico de la persona encargada del cumplimiento de los fallos de tutela, así como los datos de su superior jerárquico. Para tal efecto, remítaseles copia del escrito de tutela y sus anexos, así como de la presente decisión.
                        </p>
                        <p>CUARTO. - TENER como pruebas los documentos aportados con la solicitud de amparo.</p>
                        <p>QUINTO. - Cumplido lo anterior, vuelva al Despacho para proveer lo pertinente."</p>
                      </div>
                      <div className="pt-2">
                        <p>Para ver la tutela y sus anexos haga click en el siguiente link:</p>
                        <a
                          href={alertaDespachoActiva.linkTutelaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1 font-bold text-cyan-400 underline hover:text-cyan-300 break-all"
                        >
                          {alertaDespachoActiva.linkTutelaTexto}
                        </a>
                      </div>
                      <p className="text-amber-200/90 bg-amber-950/30 border border-amber-500/30 rounded-lg p-3">
                        INFORMACIÓN IMPORTANTE: Para efectos de dar respuesta a la acción de tutela, la misma podrá remitirse, además del escrito en original a ésta Sede Judicial, a través del correo electrónico{' '}
                        <span className="underline text-amber-300">j11pqccmbta@cendoj.ramajudicial.gov.co</span>, indicándose de manera completa su referencia
                      </p>
                      <p>Agradezco su atención y solicito confirmar recibido.</p>
                      <div>
                        <p>Atentamente,</p>
                        <p className="font-bold text-slate-100 mt-1">Lorenzo Hernández de la Hoz</p>
                        <p className="text-slate-400">Citador</p>
                      </div>
                    </div>

                    {/* Cuadro de opciones de la Tutela */}
                    <div className="space-y-3 mb-5">
                      <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-300 block">
                        {alertaDespachoActiva.preguntaOpciones || 'Una vez verificada la información ¿cómo procede?'}
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(alertaDespachoActiva.opciones || []).map((op, idx) => {
                          const isSelected = opcionTemporal === op;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setOpcionTemporal(op)}
                              className={`text-left rounded-2xl border p-3.5 font-mono text-xs md:text-sm transition-all flex items-start gap-3 ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-950/80 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                                  : 'border-slate-800/90 bg-[#070c16] text-slate-200 hover:bg-[#0d182b] hover:border-slate-700'
                              }`}
                            >
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                                }`}
                              >
                                {isSelected && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                              </span>
                              <span className="leading-snug font-bold">{op}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 border-t border-red-500/30 pt-4">
                      <button
                        type="button"
                        onClick={handleResolverAlertaDespacho}
                        className="rounded-xl border border-red-400/50 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-8 py-2.5 font-mono text-xs md:text-sm font-bold text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:shadow-[0_0_35px_rgba(239,68,68,0.7)] transition active:scale-95"
                      >
                        Confirmar Procedimiento
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL RESOLVER ACTIVIDAD / TOMA DE DECISIÓN LEGAL SEGÚN MANUAL FGN */}
      {actividadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-6xl xl:max-w-7xl rounded-3xl border border-cyan-500/40 bg-[#0a1220] p-6 md:p-8 shadow-[0_0_80px_rgba(6,182,212,0.3)] flex flex-col max-h-[94vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-cyan-500/20 pb-4 mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-cyan-950 border border-cyan-500/40 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300">
                    GESTIÓN SEGÚN MANUAL DE FUNCIONES FGN
                  </span>
                  {actividadModal.esDelegadaPorFiscal && (
                    <span className="rounded-md bg-blue-950 border border-blue-500/40 px-2.5 py-1 text-xs font-mono font-bold text-blue-300">
                      TRASLADO DE FISCALÍA
                    </span>
                  )}
                </div>
                <h3 className="font-mono text-xl font-black text-slate-100 mt-2.5">
                  {actividadModal.titulo}
                </h3>
                {actividadModal.radicado && (
                  <p className="text-sm font-mono text-amber-400 mt-1">
                    Expediente: <span className="font-bold">{actividadModal.radicado}</span> • {actividadModal.delito}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActividadModal(null)}
                className="text-slate-400 hover:text-white text-2xl font-mono p-1 transition"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Contexto / Descripción del caso */}
            <div className="rounded-2xl border border-slate-800 bg-[#050a14] p-4 mb-5 text-sm font-mono text-slate-200 leading-relaxed">
              <span className="text-cyan-400 font-bold block mb-1 uppercase tracking-wider text-xs">
                Antecedente / Contexto de la Actividad:
              </span>
              {actividadModal.descripcion}
            </div>

            {/* Catálogo Específico de Decisiones FGN */}
            <div className="space-y-3 mb-5">
              <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-300 block">
                Seleccione la actuación legal que corresponde a sus funciones:
              </label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[44vh] overflow-y-auto pr-2">
                {DECISIONES_ASISTENTE_FGN.map((op) => {
                  const isSelected = opcionTemporal.startsWith(op.label) || opcionTemporal === op.label;
                  const isIgnorar = op.id === 'FGN-10';
                  const isOtra = op.id === 'FGN-11';

                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setOpcionTemporal(op.label)}
                      className={`text-left rounded-2xl border p-3.5 font-mono text-xs md:text-sm transition-all flex items-start gap-3 ${
                        isOtra ? 'lg:col-span-2' : ''
                      } ${
                        isSelected
                          ? isIgnorar
                            ? 'border-slate-500 bg-slate-800/90 text-white shadow-lg ring-1 ring-slate-400'
                            : 'border-cyan-400 bg-cyan-950/80 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                          : 'border-slate-800/90 bg-[#070c16] text-slate-300 hover:bg-[#0d182b] hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                      </span>
                      <div className="flex-1">
                        <span className="leading-snug font-bold block">{op.label}</span>
                        <span className="text-[11px] text-cyan-400/90 italic block mt-1">
                          {op.norma}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Si seleccionó "11. Otra opción", mostrar campo para especificar */}
            {opcionTemporal.includes('11. Otra') && (
              <div className="space-y-1.5 mb-5 animate-fadeIn">
                <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-amber-300 block">
                  Especifique la actuación que desarrollará:
                </label>
                <input
                  type="text"
                  value={otraOpcionTexto}
                  onChange={(e) => setOtraOpcionTexto(e.target.value)}
                  placeholder="Ej: Gestionar requerimiento especial ante Medicina Legal..."
                  className="w-full rounded-2xl border border-amber-500/50 bg-[#050a14] p-3.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 font-mono"
                />
              </div>
            )}

            {/* Campo de Justificación Obligatoria */}
            <div className="space-y-2 mb-6">
              <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-amber-300 block">
                Argumento o justificación técnica de su decisión (Requerido para el informe PDF):
              </label>
              <textarea
                rows={3}
                value={justificacionTemporal}
                onChange={(e) => setJustificacionTemporal(e.target.value)}
                placeholder="Escriba los motivos procesales, técnicos o legales conforme al Manual de Funciones FGN que sustentan su decisión..."
                className="w-full rounded-2xl border border-slate-800 bg-[#03060d] p-3.5 text-xs md:text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 resize-none font-mono"
              />
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-4 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setActividadModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-2.5 font-mono text-xs md:text-sm font-bold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarGestion}
                disabled={guardandoGestion}
                className="rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-7 py-2.5 font-mono text-xs md:text-sm font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition disabled:opacity-50"
              >
                {guardandoGestion ? 'Guardando...' : 'Guardar y Registrar Actuación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PANTALLA INICIAL DE BIENVENIDA (ASISTENTE DE FISCAL) */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-no-repeat bg-cover bg-center text-slate-100 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(6, 10, 15, 0.96) 0%, rgba(6, 10, 15, 0.94) 100%), url(${fondoLogin})`,
          }}
        >
          <div className="flex flex-col items-center max-w-lg px-8 text-center space-y-8 animate-welcome-fade">
            {/* Logos */}
            <div className="flex items-center justify-center gap-8 md:gap-12 animate-welcome-zoom">
              <img
                src={nexusLogo}
                alt="Logo NEXUS DAE"
                className="h-32 w-auto drop-shadow-[0_0_20px_rgba(0,240,255,0.25)]"
              />
              <div className="h-20 w-px bg-slate-700" />
              <img
                src={fgnLogo}
                alt="Logo Fiscalía"
                className="h-12 w-auto drop-shadow-[0_0_15px_rgba(0,240,255,0.15)]"
              />
            </div>

            {/* Welcoming Text */}
            <div className="space-y-4 animate-welcome-slide1">
              <h1 className="font-mono text-3xl font-bold uppercase tracking-[0.15em] text-cyan-300 drop-shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                Bienvenido a tu despacho
              </h1>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Has ingresado a NEXUS como <strong className="text-cyan-300">Asistente de Fiscal</strong> de la Fiscalía General de la Nación. Prepárate para analizar casos, gestionar órdenes, atender usuarios y presentar propuestas estratégicas en tu despacho.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                setShowWelcome(false);
                setShowInstructions(true);
                setCurrentStep(1);
              }}
              className="animate-welcome-slide2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-8 py-3 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-500/20 hover:text-white"
            >
              Continuar a las instrucciones
            </button>
          </div>
        </div>
      )}

      {/* 7. WIZARD DE INSTRUCCIONES EN 4 PASOS (NEXUS – ASISTENTES DE FISCAL) */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-no-repeat bg-cover bg-center p-4 md:p-8 overflow-hidden text-slate-100"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(6, 10, 15, 0.97) 0%, rgba(6, 10, 15, 0.94) 100%), url(${fondoLogin})`,
          }}
        >
          <div className="flex h-full max-h-[86vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            {/* Sidebar */}
            <div className="hidden md:flex w-80 flex-col border-r border-cyan-500/20 bg-slate-950/40 p-6 justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                    Inducción Asistente de Fiscal
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400">NEXUS – ASISTENTES DE FISCAL</p>
                </div>

                <div className="relative pl-8 space-y-8 py-2">
                  <div className="absolute left-3.5 top-[14px] bottom-[14px] w-[3px]">
                    <div className="absolute inset-0 bg-slate-800 rounded-full" />
                    <div
                      className="absolute top-0 w-full bg-gradient-to-b from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-500 ease-out rounded-full"
                      style={{
                        height: `${((currentStep - 1) / 3) * 100}%`
                      }}
                    />
                  </div>

                  {[
                    { id: 1, name: 'Bienvenido a tu Despacho' },
                    { id: 2, name: '¿Qué es NEXUS?' },
                    { id: 3, name: 'Cada decisión cambia la historia' },
                    { id: 4, name: 'Tu objetivo' }
                  ].map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <div
                        key={step.id}
                        className="relative flex items-center gap-4 transition duration-300 animate-welcome-fade"
                      >
                        <div
                          className={`absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-mono font-bold transition-all duration-500 ${
                            isActive
                              ? 'border-cyan-400 bg-slate-950 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-110'
                              : isCompleted
                              ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              : 'border-slate-700 bg-slate-900 text-slate-500'
                          }`}
                        >
                          {step.id}
                        </div>
                        <span
                          className={`font-mono text-xs transition-colors duration-300 ${
                            isActive
                              ? 'text-cyan-300 font-bold'
                              : isCompleted
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-500/20 bg-slate-900/40 p-3">
                <p className="font-mono text-[9px] text-slate-400/80 leading-normal">
                  Este manual de inducción te preparará para asumir el rol de Asistente de Fiscal en el Despacho. Sigue los pasos indicados.
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden bg-slate-900/40">
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {/* Paso 1: Bienvenido a tu Despacho */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiShield size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Bienvenido a tu Despacho</h2>
                        <p className="text-sm text-slate-300/80">Usted asume el rol de Asistente de Fiscal dentro del equipo de trabajo del despacho.</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-200 font-semibold animate-stagger-2">
                      💡 Su despacho es mixto, conoce de diferentes delitos y temáticas. Para cada alarma o alerta urgente del despacho dispone de <strong>5 minutos</strong> para tomar una decisión.
                    </div>

                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-3">
                      Acaba de llegar a su oficina como <strong>Asistente de Fiscal</strong>. El reloj institucional marca el inicio de su jornada y la acumulación de trabajo en el despacho ya es evidente.
                    </div>

                    {/* 4 Cards Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 animate-stagger-4">
                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiFileText size={18} />
                          Noticias criminales
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Más de 50 noticias criminales (61 casos en la carga del despacho) pendientes de revisión.</p>
                      </div>

                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiInbox size={18} />
                          Correo institucional
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Solicitudes, órdenes y comunicaciones esperando gestión y respuesta.</p>
                      </div>

                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiUsers size={18} />
                          Víctima en sala
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Una víctima está esperando ser atendida personalmente.</p>
                      </div>

                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiUsers size={18} />
                          Usuarios que atender
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Usuarios y peticionarios requieren atención, orientación e información procesal en el despacho.</p>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-300 animate-stagger-5">
                      Como Asistente de Fiscal usted integra el equipo de trabajo del despacho apoyando las labores operativas, investigativas y de análisis. El tiempo para resolver las alarmas que se activan en pantalla es de <strong className="text-cyan-300">5 minutos</strong>. Cada decisión tendrá consecuencias.
                    </p>
                  </div>
                )}

                {/* Paso 2: ¿Qué es NEXUS? */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiLink size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">¿Qué es NEXUS?</h2>
                        <p className="text-sm text-slate-300/80">Simulación interactiva para Asistentes de Fiscal.</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-2">
                      NEXUS es una actividad de simulación interactiva en la que usted asume el rol de asistente de fiscal de un Despacho con una carga real de trabajo.
                    </div>

                    <div className="space-y-3 animate-stagger-3">
                      <h4 className="font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">Durante el juego deberá:</h4>

                      {[
                        'Analizar noticias criminales.',
                        'Gestionar el cumplimiento de órdenes a su cargo.',
                        'Atender víctimas y peticionarios.',
                        'Identificar procesos en el marco de la justicia restaurativa.'
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-5 py-3.5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-md"
                        >
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0" />
                          <span className="text-base text-slate-200">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paso 3: Cada decisión cambia la historia (Las 3 Fases) */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiZap size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Cada decisión cambia la historia</h2>
                        <p className="text-sm text-slate-300/80">Fases de actuación desde su rol de Asistente de Fiscal.</p>
                      </div>
                    </div>

                    <div className="space-y-4 animate-stagger-2">
                      {/* Fase 1 */}
                      <div className="rounded-xl border border-cyan-500/40 bg-slate-950/70 p-5 shadow-lg transition-all duration-300 hover:border-cyan-400">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300 uppercase">
                            Fase 1
                          </span>
                          <h3 className="font-mono text-base font-bold text-cyan-200">
                            Revisión de la carga y propuesta de asociación
                          </h3>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          Como parte del equipo de trabajo del Despacho, deberá revisar las noticias criminales asignadas a su Despacho y desde su rol de asistente, presentar propuestas de asociación identificando patrones y fenómenos criminales con su respectiva justificación.
                        </p>
                      </div>

                      {/* Fase 2 */}
                      <div className="rounded-xl border border-amber-500/40 bg-slate-950/70 p-5 shadow-lg transition-all duration-300 hover:border-amber-400">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300 uppercase">
                            Fase 2
                          </span>
                          <h3 className="font-mono text-base font-bold text-amber-200">
                            Priorizar la gestión de las órdenes a su cargo
                          </h3>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          Deberá revisar la totalidad de órdenes a su cargo, en el marco del cumplimiento de las funciones transitorias como policía judicial, y presentar la propuesta de priorización para la ejecución de las mismas con su respectiva justificación.
                        </p>
                      </div>

                      {/* Fase 3 */}
                      <div className="rounded-xl border border-emerald-500/40 bg-slate-950/70 p-5 shadow-lg transition-all duration-300 hover:border-emerald-400">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300 uppercase">
                            Fase 3
                          </span>
                          <h3 className="font-mono text-base font-bold text-emerald-200">
                            Identificación de procesos que pueden ser resueltos por vías alternas a la justicia ordinaria
                          </h3>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          Producto de análisis de la carga del Despacho (61 casos) y de la caracterización de las víctimas y de la identificación de los indiciados identifique al menos 3 casos que pueden ser resueltos por vías de la justicia restaurativa con su respectiva justificación.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paso 4: Tu objetivo */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiTarget size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Objetivo de NEXUS</h2>
                        <p className="text-sm text-slate-300/80">Lo que se evalúa en la simulación de Asistente de Fiscal.</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-2">
                      Lograr un apoyo técnico-jurídico eficaz en el Despacho mediante propuestas de asociación fundamentadas, priorización oportuna de órdenes y aplicación de justicia restaurativa.
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger-3">
                      {[
                        { title: 'Análisis de Patrones', icon: <FiLink size={20} className="text-cyan-400" /> },
                        { title: 'Priorización de Órdenes', icon: <FiZap size={20} className="text-cyan-400" /> },
                        { title: 'Justicia Restaurativa', icon: <FiTarget size={20} className="text-cyan-400" /> },
                        { title: 'Atención a Usuarios y Víctimas', icon: <FiUsers size={20} className="text-cyan-400" /> },
                        { title: 'Funciones de Policía Judicial', icon: <FiShield size={20} className="text-cyan-400" /> },
                        { title: 'Argumentación y Justificación', icon: <FiTrendingUp size={20} className="text-cyan-400" /> }
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-center text-center rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg text-slate-200"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950/40 border border-slate-700/50 mb-3">
                            {item.icon}
                          </div>
                          <span className="text-sm font-bold tracking-wide">{item.title}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm text-amber-200 font-semibold text-center italic leading-relaxed animate-stagger-4">
                      "En un despacho fiscal real, el criterio analítico y oportuno del Asistente de Fiscal es determinante para transformar la congestión procesal en resultados efectivos de justicia."
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-stagger-5 shadow-xl">
                      <div>
                        <h4 className="font-mono text-sm font-bold text-cyan-300">¡Todo listo para comenzar!</h4>
                        <p className="text-xs text-slate-300 mt-1 leading-normal">Ingrese al despacho y asuma su rol de Asistente de Fiscal.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation controls */}
              <div className="flex items-center justify-between border-t border-cyan-500/20 bg-slate-950/40 p-6">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((curr) => curr - 1)}
                      className="rounded-lg border border-slate-500/30 bg-slate-900/60 px-5 py-2 font-mono text-xs font-semibold text-slate-300 transition hover:bg-slate-700/50 hover:text-white"
                    >
                      ← Anterior
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentStep < 4) {
                      setCurrentStep((curr) => curr + 1);
                    } else {
                      setShowInstructions(false);
                      if (usuario?.primera_vez !== false) {
                        setShowTeamSetupModal(true);
                      }
                    }
                  }}
                  className={`rounded-lg px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-lg transition-all duration-300 ${
                    currentStep === 4
                      ? 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:from-cyan-400 hover:to-cyan-300 hover:shadow-cyan-400/80 scale-105 border border-cyan-300/30'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 hover:shadow-cyan-500/20'
                  }`}
                >
                  {currentStep < 4 ? 'Siguiente →' : 'Ir a Nexus →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL CONFIGURACIÓN DE INTEGRANTES DEL EQUIPO (ASISTENTE DE FISCAL) */}
      {showTeamSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-8 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#070b13]/95 p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col">
            <div className="border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-mono text-base font-bold text-cyan-400 uppercase tracking-wider">
                Configuración del Equipo de Trabajo (Asistente de Fiscal)
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Ingresa los integrantes del equipo que participan en esta estación para el informe oficial en PDF.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Nombres de los integrantes (separados por coma o salto de línea):
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Dra. Diana Marcela Peña, Juan Camilo Restrepo, Laura Sofía Vega"
                  value={teamMembersInputString}
                  onChange={(e) => setTeamMembersInputString(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 font-mono transition shadow-inner leading-relaxed resize-none"
                />
                <p className="text-[11px] text-slate-500 font-mono mt-1.5">
                  Estos integrantes se certificarán en el informe técnico operativo descargable en PDF.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
              <button
                type="button"
                onClick={async () => {
                  const valids = teamMembersInputString.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
                  if (valids.length === 0) {
                    alert('Debes ingresar al menos el nombre de un integrante para continuar.');
                    return;
                  }
                  localStorage.setItem(`nexus_team_members_${usuario?.id}`, JSON.stringify(valids));
                  localStorage.setItem(`nexus_team_members_raw_${usuario?.id}`, teamMembersInputString);
                  setShowTeamSetupModal(false);
                  try {
                    await completarPrimeraVez();
                  } catch (e) {
                    console.error(e);
                  }
                  if (usuario?.equipo_id) {
                    axios.post(`${API_URL}/equipos/${usuario.equipo_id}/timer/start`, {}, { headers: authHeaders })
                      .then(() => setTeamTimerStarted(true))
                      .catch(console.warn);
                  }
                }}
                className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/40 px-6 py-2.5 text-xs font-bold text-white transition shadow-lg font-mono tracking-wider"
              >
                Comenzar en el Despacho →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
