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
  FiMaximize2
} from 'react-icons/fi';
import useAuthStore from '../store/useAuthStore';

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

// Catálogo de Alertas Periódicas de Despacho para el Asistente (Cada 10 minutos con 3 min de duración)
const ALERTAS_DESPACHO_ASISTENTE = [
  {
    id: 'ALR-ASIST-01',
    titulo: 'Requerimiento Urgente de Juzgado: Término perentorio para soporte probatorio',
    radicado: '110016000099202325078',
    delito: 'ESTAFA',
    descripcion: 'El Centro de Servicios Judiciales emite requerimiento de urgencia con término de 2 horas para allegar matriz de evidencia y minutas de actos urgentes del despacho. Debe decidir la actuación inmediata conforme al Manual de Funciones FGN.'
  },
  {
    id: 'ALR-ASIST-02',
    titulo: 'Víctima y Denunciante en Ventanilla solicitan constancia procesal y estado de investigación',
    radicado: '050016000206202100084',
    delito: 'HURTO CALIFICADO',
    descripcion: 'La víctima se presenta de forma presencial requiriendo información sobre el avance investigativo, individualización de sospechosos y copia autenticada de actuaciones autorizadas.'
  },
  {
    id: 'ALR-ASIST-03',
    titulo: 'Investigador de Policía Judicial aporta cadena de custodia y fijación técnica urgente',
    radicado: '110016000099202101523',
    delito: 'EXPLOTACIÓN ILÍCITA DE YACIMIENTO MINERO',
    descripcion: 'El jefe de grupo de policía judicial entrega formatos de campo, fijaciones fotográficas y medio magnético que requieren cotejo documental, verificación de rotulado e incorporación formal al expediente.'
  },
  {
    id: 'ALR-ASIST-04',
    titulo: 'Buzón ARKIVA: Notificación de Acción de Tutela con término perentorio de 4 horas',
    radicado: 'General / Diligencia Despacho',
    delito: 'ACCIONES CONSTITUCIONALES',
    descripcion: 'Se recibió notificación de tutela solicitando informe pormenorizado sobre diligencias de indagación previa. Requiere proyectar contestación técnica para firma y refrendación del Fiscal Titular.'
  },
  {
    id: 'ALR-ASIST-05',
    titulo: 'Auditoría SPOA: Alerta preventiva de vencimiento de términos de indagación preliminar',
    radicado: 'General / Control de Despacho',
    delito: 'AUDITORÍA PROCESAL',
    descripcion: 'El sistema misional reporta investigaciones preliminares próximas a término sin formulación de imputación. Se requiere clasificar folios para preparar proyecto de archivo o impulso metodológico.'
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
  const { completarPrimeraVez } = useAuthStore();
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => usuario?.primera_vez !== false);

  const [actividades, setActividades] = useState(ACTIVIDADES_INICIALES);
  const [carpetas, setCarpetas] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Filtros de búsqueda (igual que en el Módulo de Casos del Fiscal)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelito, setSelectedDelito] = useState('Todos');

  // Modal de resolución de actividad
  const [actividadModal, setActividadModal] = useState(null);
  const [opcionTemporal, setOpcionTemporal] = useState('');
  const [otraOpcionTexto, setOtraOpcionTexto] = useState('');
  const [justificacionTemporal, setJustificacionTemporal] = useState('');
  
  // Estados de Alerta Periódica de Despacho (Cada 10 min, 3 min de duración en pantalla)
  const [alertaDespachoActiva, setAlertaDespachoActiva] = useState(null);
  const [alertaCountdown, setAlertaCountdown] = useState(180); // 3 minutos = 180s
  const [shownAlertasAsistenteIds, setShownAlertasAsistenteIds] = useState([]);
  const [lastAlertaTriggerTime, setLastAlertaTriggerTime] = useState(null);
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
  const [showTeamModal, setShowTeamModal] = useState(false);
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

  // Sincronizar estado de primera vez si cambia usuario
  useEffect(() => {
    if (usuario && usuario.primera_vez !== false) {
      setShowWelcomeModal(true);
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

    // Tick local cada segundo para fluidez visual continua (solo si el timer ya inició)
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

    // 5. Disparo de Alertas Periódicas cada 10 minutos (600s) con 3 minutos de duración en pantalla
  useEffect(() => {
    if (showWelcomeModal) return;

    const elapsed = Math.max(0, 7200 - timeLeft);
    if (lastAlertaTriggerTime === null) {
      setLastAlertaTriggerTime(elapsed);
      return;
    }

    if (alertaDespachoActiva !== null) return;

    const requiredDelay = 600; // 10 minutos exactos
    const diff = elapsed - lastAlertaTriggerTime;

    if (diff >= requiredDelay) {
      const available = ALERTAS_DESPACHO_ASISTENTE.filter((a) => !shownAlertasAsistenteIds.includes(a.id));
      if (available.length > 0) {
        const nextAlert = available[0];
        setAlertaDespachoActiva(nextAlert);
        setAlertaCountdown(180); // 3 minutos
        setOpcionTemporal('');
        setOtraOpcionTexto('');
        setJustificacionTemporal('');
        setShownAlertasAsistenteIds((prev) => [...prev, nextAlert.id]);
        setLastAlertaTriggerTime(elapsed);
      }
    }
  }, [timeLeft, showWelcomeModal, alertaDespachoActiva, lastAlertaTriggerTime, shownAlertasAsistenteIds]);

  // Conteo regresivo de la Alerta (3 minutos en pantalla)
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
    if (usuario?.equipo_id) {
      try {
        await axios.post(
          `${API_URL}/equipos/${usuario.equipo_id}/timer/penalty`,
          {
            minutes: 2,
            reason: 'Tiempo límite agotado en Alerta del Despacho (3 min)',
            byUser: usuario?.nombre || 'Asistente de Fiscal'
          },
          { headers: authHeaders }
        );
      } catch (e) {
        console.warn('Error aplicando penalización por tiempo agotado en alerta:', e);
      }
    }
  };

  const handleResolverAlertaDespacho = async () => {
    if (!alertaDespachoActiva) return;
    if (!opcionTemporal) {
      alert('Por favor seleccione una actuación legal del catálogo para resolver la alerta.');
      return;
    }
    if (!justificacionTemporal.trim()) {
      alert('Por favor ingrese la justificación técnica de su decisión.');
      return;
    }

    // Registrar como actividad resuelta
    const decisionFinal = opcionTemporal.includes('11. Otra') && otraOpcionTexto.trim()
      ? `11. Otra actuación: ${otraOpcionTexto.trim()}`
      : opcionTemporal;

    const nuevaActividadResuelta = {
      id: alertaDespachoActiva.id,
      titulo: alertaDespachoActiva.titulo,
      radicado: alertaDespachoActiva.radicado,
      delito: alertaDespachoActiva.delito,
      urgencia: 'ALTA',
      descripcion: alertaDespachoActiva.descripcion,
      estado: 'RESUELTA',
      opcionSeleccionada: decisionFinal,
      justificacion: justificacionTemporal.trim(),
      esDelegadaPorFiscal: false
    };

    setActividades((prev) => [nuevaActividadResuelta, ...prev]);
    setAlertaDespachoActiva(null);
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
      const integrantesStr = equipoInfo.integrantes.map((i) => `${i.nombre} (${i.rol})`).join(' | ');
      writeLine(`Integrantes del Grupo: ${integrantesStr}`);
    }
    writeLine(`Fecha de emisión: ${new Date().toLocaleString()}`);
    writeLine(`Tiempo restante registrado: ${formatTime(timeLeft)}`);
    y += 4;

    const totalActividades = actividades.length;
    const atendidas = actividades.filter((a) => a.estado === 'REALIZADA').length;
    const ignoradas = actividades.filter((a) => a.estado === 'IGNORADA').length;
    const pendientes = actividades.filter((a) => a.estado === 'PENDIENTE').length;

    writeLine('1. BALANCE DE GESTIÓN Y ACTIVIDADES DEL DESPACHO', 12, [15, 23, 42], 'bold');
    writeLine(`Total de actividades recibidas: ${totalActividades}`);
    writeLine(`Actividades atendidas / tramitadas: ${atendidas}`);
    writeLine(`Actividades ignoradas / descartadas: ${ignoradas}`);
    writeLine(`Actividades pendientes por resolver: ${pendientes}`);
    y += 5;

    writeLine('2. REGISTRO DETALLADO DE ACTUACIONES Y JUSTIFICACIONES', 12, [15, 23, 42], 'bold');
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
            onClick={() => setShowWelcomeModal(true)}
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

      {/* 2. MAIN LAYOUT: MÓDULO DE CASOS + BARRA DE ACTIVIDADES (SIN AGRUPACIÓN) */}
      <main className="p-6 flex-1 flex flex-col space-y-6 max-w-full mx-auto w-full">
        {/* Banner de Inspección */}
        <div className="flex flex-wrap items-center justify-between rounded-xl border border-cyan-500/30 bg-slate-950/80 px-6 py-3.5 backdrop-blur-md shadow-xl gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400 font-mono font-bold">MÓDULO DE CASOS</p>
            <h1 className="mt-0.5 font-mono text-xl font-bold tracking-[0.15em] text-slate-100">Procesos del despacho</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
            MODO DE INSPECCIÓN GENERAL DE EXPEDIENTES (ASISTENTE FISCAL)
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

        {/* Contenedor Dividido: Grid de Casos (Izquierda) + Actividades Operativas (Derecha) */}
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

                  return (
                    <div
                      key={caseItem.id}
                      className="group rounded-xl border border-slate-800 bg-slate-950/80 hover:border-cyan-500/50 overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between backdrop-blur-md"
                    >
                      {/* Miniatura del Folio (Clickable para abrir visor fullscreen) */}
                      <div 
                        onClick={() => handleOpenDetailModal(caseItem)}
                        className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-800 cursor-pointer"
                        title="Haz clic para abrir el folio a pantalla completa"
                      >
                        {caseItem.imagen_url ? (
                          <img
                            src={caseItem.imagen_url}
                            alt={caseItem.nombre}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-600">
                            <FiFolder size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="rounded-lg bg-slate-950/80 border border-cyan-400/50 px-3 py-1 font-mono text-xs font-bold text-cyan-300">
                            🔍 Ampliar Folio
                          </span>
                        </div>
                      </div>

                      {/* Contenido de la Tarjeta (SIN CHECKBOXES) */}
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
          </div>

          {/* COLUMNA DERECHA: ACTIVIDADES Y DILIGENCIAS DEL DESPACHO */}
          <aside className="xl:col-span-1 bg-slate-950/80 p-5 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl flex flex-col space-y-4 max-h-[82vh] overflow-hidden sticky top-24">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <FiAlertCircle size={15} className="text-amber-400" />
                  Actividades del Despacho
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
                const isRealizada = act.estado === 'REALIZADA';
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
          </aside>
        </div>
      </main>

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

      
      {/* 5. MODAL DE ALERTA PERIÓDICA DE DESPACHO (CADA 10 MIN, 3 MIN EN PANTALLA) */}
      {alertaDespachoActiva && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-slate-950/95 backdrop-blur-md">
          <div className="relative w-full max-w-6xl xl:max-w-7xl rounded-3xl border-2 border-red-500/80 bg-gradient-to-b from-[#180505] via-[#0b101d] to-[#050912] p-6 md:p-8 shadow-[0_0_90px_rgba(239,68,68,0.5)] flex flex-col max-h-[94vh] overflow-y-auto">
            {/* Header de Emergencia */}
            <div className="border-b border-red-500/30 pb-4 mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-red-950 border border-red-500/60 px-2.5 py-1 text-xs font-mono font-black text-red-300 animate-pulse uppercase">
                    🚨 ALERTA URGENTE DE DESPACHO
                  </span>
                  <span className="rounded-md bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs font-mono text-cyan-300">
                    SISTEMA JUDICIAL EN VIVO
                  </span>
                </div>
                <h3 className="font-mono text-xl md:text-2xl font-black text-slate-100 mt-2">
                  {alertaDespachoActiva.titulo}
                </h3>
                {alertaDespachoActiva.radicado && (
                  <p className="text-sm font-mono text-amber-400 mt-1">
                    Expediente: <span className="font-bold">{alertaDespachoActiva.radicado}</span> • {alertaDespachoActiva.delito}
                  </p>
                )}
              </div>

              {/* Countdown Timer de 3 Minutos */}
              <div className="inline-flex flex-col items-center bg-red-950/60 border border-red-500/70 rounded-2xl px-6 py-2 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <span className="text-[10px] tracking-[0.2em] uppercase text-red-400 font-mono font-black animate-pulse">
                  TIEMPO LÍMITE DE DECISIÓN
                </span>
                <span className="text-3xl font-black text-red-400 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                  {Math.floor(alertaCountdown / 60).toString().padStart(2, '0')}:{Math.floor(alertaCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Contexto de la Alerta */}
            <div className="rounded-2xl border border-red-500/30 bg-[#120406]/80 p-4 mb-5 text-sm font-mono text-slate-200 leading-relaxed">
              <span className="text-red-400 font-bold block mb-1 uppercase tracking-wider text-xs">
                Antecedente / Hecho Procesal en Curso:
              </span>
              {alertaDespachoActiva.descripcion}
            </div>

            {/* Catálogo de Decisiones FGN */}
            <div className="space-y-3 mb-5">
              <label className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-300 block">
                Seleccione la actuación legal que corresponde a sus funciones para resolver la alerta:
              </label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[38vh] overflow-y-auto pr-2">
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

            {/* Otra opción input */}
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

            {/* Justificación obligatoria */}
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

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-red-500/30 pt-4">
              <button
                type="button"
                onClick={handleResolverAlertaDespacho}
                className="rounded-xl border border-red-400/50 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-8 py-2.5 font-mono text-xs md:text-sm font-bold text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:shadow-[0_0_35px_rgba(239,68,68,0.7)] transition active:scale-95"
              >
                Guardar y Resolver Alerta Urgente
              </button>
            </div>
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

      {/* 5. MODAL DE INDUCCIÓN Y BIENVENIDA (PRIMERA VEZ) */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-3xl border-2 border-cyan-500/50 bg-gradient-to-b from-[#0b1626] to-[#050b14] p-8 shadow-[0_0_70px_rgba(6,182,212,0.35)] flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="text-center pb-5 border-b border-cyan-500/20">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <FiShield size={32} />
              </div>
              <h2 className="font-mono text-xl md:text-2xl font-black text-slate-100 tracking-wider uppercase">
                BIENVENIDO AL ENTORNO DE ASISTENTE DE FISCAL
              </h2>
              <p className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest mt-1">
                Sistema NEXUS - DAE | Despacho Operativo
              </p>
            </div>

            {/* Mensaje institucional solicitado */}
            <div className="my-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-5 text-sm md:text-base font-mono text-slate-100 leading-relaxed text-center shadow-inner">
              <p>
                <strong className="text-cyan-300">Bienvenido al entorno de asistente de fiscal</strong>, aquí podrá revisar los expedientes de su despacho, realizar y apoyar las labores encomendadas por el fiscal delegado en las investigaciones y la gestión del despacho.
              </p>
            </div>

            {/* 3 Pilares del Asistente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-slate-800 bg-[#070e1c] p-4 text-center flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                  <FiFolder size={20} />
                </div>
                <h4 className="font-mono text-xs font-bold text-slate-100 mb-1">Revisión de Casos</h4>
                <p className="text-[11px] text-slate-400 leading-normal font-mono">
                  Consulte noticias criminales (NUNC) y folios documentales de su despacho.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#070e1c] p-4 text-center flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                  <FiInbox size={20} />
                </div>
                <h4 className="font-mono text-xs font-bold text-slate-100 mb-1">Apoyo y Alertas</h4>
                <p className="text-[11px] text-slate-400 leading-normal font-mono">
                  Recepcione y atienda en tiempo real las diligencias delegadas por su Fiscal.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#070e1c] p-4 text-center flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                  <FiFileText size={20} />
                </div>
                <h4 className="font-mono text-xs font-bold text-slate-100 mb-1">Justificación Técnica</h4>
                <p className="text-[11px] text-slate-400 leading-normal font-mono">
                  Sustente cada trámite según la normativa legal para el reporte en PDF.
                </p>
              </div>
            </div>

            {/* Registro de Integrantes del Asistente */}
            <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-[#070e1c] p-5 text-left shadow-inner">
              <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5 font-mono">
                Integrantes del equipo de trabajo (en esta estación):
              </label>
              <p className="text-[11px] text-slate-400 mb-2.5 font-mono">
                Ingresa los nombres de las personas que participan en este equipo (separados por coma o salto de línea):
              </p>
              <textarea
                rows={2}
                placeholder="Ej: Dra. Diana Marcela Peña, Juan Camilo Restrepo, Laura Sofía Vega"
                value={teamMembersInputString}
                onChange={(e) => setTeamMembersInputString(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 font-mono shadow-inner transition resize-none leading-relaxed"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                Estos integrantes quedarán certificados formalmente en el informe operativo final en PDF.
              </p>
            </div>

            {/* Botón de Ingreso al Despacho */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={async () => {
                  const valids = teamMembersInputString.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
                  if (valids.length === 0) {
                    alert('Debes ingresar al menos el nombre de un integrante para registrar el equipo y comenzar.');
                    return;
                  }
                  localStorage.setItem(`nexus_team_members_${usuario?.id}`, JSON.stringify(valids));
                  localStorage.setItem(`nexus_team_members_raw_${usuario?.id}`, teamMembersInputString);
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
                  setShowWelcomeModal(false);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 px-8 py-3.5 font-mono text-sm font-black tracking-widest text-white shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_45px_rgba(6,182,212,0.8)] transition-all transform hover:scale-[1.02] active:scale-95"
              >
                <span>INGRESAR AL DESPACHO OPERATIVO →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
