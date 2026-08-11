import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiFolder,
  FiLink,
  FiMapPin,
  FiPlay,
  FiSave,
  FiShield,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiUsers,
  FiXCircle,
  FiZap,
} from 'react-icons/fi';
import useAuthStore from '../store/useAuthStore';
import CasesSidebarModule from './CasesSidebarModule';
import fgnLogo from '../assets/fgn-logo.png';
import nexusLogo from '../assets/NEXUS-DAE.png';
import fondoLogin from '../assets/fondo-login.png';
import fondoAdmin from '../assets/fondo-admin.jpeg';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || '/api');
const TICK_MS = 50;
const NODE_RADIUS = 34;
const GROUP_COLOR_PALETTE = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f97316'];
const ACTOR_BADGE_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f97316'];

const PLAN_ACCION_OPTIONS = [
  {
    key: 'ordenes_policia_judicial',
    label: 'REALIZAR ORDENES A POLICIA JUDICIAL',
    requiresCual: true,
    cualLabel: '¿Cual?',
  },
  {
    key: 'audiencia_control_garantias',
    label: 'SOLICITAR AUDIENCIA A JUEZ DE CONTROL DE GARANTIAS',
    requiresCual: true,
    cualLabel: '¿Cual?',
  },
  {
    key: 'orden_archivo',
    label: 'ORDEN DE ARCHIVO',
    requiresCual: false,
    cualLabel: '',
  },
];

function buildInitialPlanAccionState() {
  return PLAN_ACCION_OPTIONS.reduce((accumulator, option) => {
    accumulator[option.key] = {
      selected: false,
      cual: '',
      justificacion: '',
    };
    return accumulator;
  }, {});
}

const CASE_METADATA_FALLBACKS = [
  {
    offenseType: 'Concierto para delinquir',
    zone: 'Area Metropolitana',
    actors: ['FGN', 'CTI'],
  },
  {
    offenseType: 'Extorsion',
    zone: 'Zona Urbana',
    actors: ['SIJIN', 'Policia Judicial'],
  },
  {
    offenseType: 'Lavado de activos',
    zone: 'Corredor financiero',
    actors: ['UIAF', 'Fiscalia Seccional'],
  },
];

function isPdfUrl(value) {
  if (!value) return false;

  const normalized = String(value).trim();
  if (normalized.startsWith('data:application/pdf')) {
    return true;
  }

  return /^https?:\/\//i.test(normalized) && /\.pdf($|\?|#)/i.test(normalized);
}

function getPdfViewerSrc(value) {
  if (!isPdfUrl(value)) {
    return null;
  }

  return String(value).trim();
}

function connectPairSet(pairIds) {
  const pairs = [];
  for (let i = 0; i < pairIds.length; i += 1) {
    for (let j = i + 1; j < pairIds.length; j += 1) {
      pairs.push({ a: pairIds[i], b: pairIds[j] });
    }
  }
  return pairs;
}

function getPairKey(a, b) {
  const first = String(a);
  const second = String(b);
  return first.localeCompare(second) <= 0 ? `${first}__${second}` : `${second}__${first}`;
}

function buildComponents(nodeIds, edges) {
  const adjacency = new Map();
  nodeIds.forEach((id) => adjacency.set(id, new Set()));

  edges.forEach(({ a, b }) => {
    if (!adjacency.has(a) || !adjacency.has(b)) {
      return;
    }

    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  });

  const visited = new Set();
  const components = [];

  nodeIds.forEach((startId) => {
    if (visited.has(startId)) {
      return;
    }

    const queue = [startId];
    const current = [];
    visited.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift();
      current.push(currentId);
      adjacency.get(currentId).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    if (current.length > 1) {
      current.sort((a, b) => String(a).localeCompare(String(b)));
      components.push(current);
    }
  });

  return components.sort((a, b) => a.length - b.length);
}

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function getDefaultGroupColor(index) {
  return GROUP_COLOR_PALETTE[index % GROUP_COLOR_PALETTE.length];
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || '').replace('#', '').trim();
  if (normalized.length !== 6) {
    return `rgba(56, 189, 248, ${alpha})`;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatPairLabel(pairKey, nameById) {
  const [a, b] = String(pairKey || '').split('__');
  const nameA = nameById.get(a) || a;
  const nameB = nameById.get(b) || b;
  return `${nameA} - ${nameB}`;
}

function firstDefinedValue(...values) {
  const found = values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');
  return found === undefined ? null : found;
}

function normalizeActors(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof rawValue === 'string') {
    return rawValue
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseQuotedCommaValues(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue
      .flatMap((item) => parseQuotedCommaValues(item))
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof rawValue !== 'string') {
    return [];
  }

  const input = rawValue.trim();
  if (!input) {
    return [];
  }

  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values
    .map((item) => item.replace(/^"+|"+$/g, '').trim())
    .filter(Boolean);
}

function parseCommaSeparatedValues(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue
      .flatMap((item) => parseCommaSeparatedValues(item))
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof rawValue !== 'string') {
    return [];
  }

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCaseDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  return parsed.toLocaleDateString('es-CO');
}

function buildCaseMetadata(caseItem, index) {
  const fallback = CASE_METADATA_FALLBACKS[index % CASE_METADATA_FALLBACKS.length];

  const offenseTypeRaw =
    firstDefinedValue(caseItem.tipo_delito, caseItem.delito, caseItem.tipo, caseItem.categoria_delito) ||
    fallback.offenseType;
  const caseDate =
    firstDefinedValue(caseItem.fecha_hecho, caseItem.fecha, caseItem.fecha_caso, caseItem.created_at) || null;
  const victimRaw = firstDefinedValue(caseItem.victima, caseItem.victimas, caseItem.perfil_victima) || 'Sin registrar';
  const offenderRaw =
    firstDefinedValue(caseItem.victimario, caseItem.victimarios, caseItem.indiciado, caseItem.imputado) || 'Sin registrar';
  const zone =
    firstDefinedValue(caseItem.zona_territorial, caseItem.territorio, caseItem.zona, caseItem.municipio) ||
    fallback.zone;

  const offenseTypes = parseQuotedCommaValues(offenseTypeRaw);
  const victims = parseCommaSeparatedValues(victimRaw);
  const offenders = parseCommaSeparatedValues(offenderRaw);

  const offenseType = offenseTypes.length > 0 ? offenseTypes.join(', ') : String(offenseTypeRaw);
  const victim = victims.length > 0 ? victims.join(', ') : String(victimRaw);
  const offender = offenders.length > 0 ? offenders.join(', ') : String(offenderRaw);

  const actors = normalizeActors(firstDefinedValue(caseItem.actores_involucrados, caseItem.actores, caseItem.equipo));
  const finalActors = actors.length > 0 ? actors : fallback.actors;

  return {
    offenseType: String(offenseType),
    offenseTypes,
    caseDate,
    caseDateLabel: formatCaseDate(caseDate),
    victim: String(victim),
    victims,
    offender: String(offender),
    offenders,
    zone: String(zone),
    actors: finalActors,
    offenseTag: String(offenseType).slice(0, 1).toUpperCase() || 'C',
  };
}

function buildGroupSnapshot(group, currentConnections, caseNameById, caseMetadataById) {
  const memberIds = [...group.ids];
  const memberSet = new Set(memberIds);
  const nodePositions = new Map(group.nodes.map((node) => [node.id, node]));

  const nodes = memberIds.map((nodeId) => {
    const metadata = caseMetadataById.get(nodeId);
    const fallbackName = caseNameById.get(String(nodeId)) || String(nodeId);
    const position = nodePositions.get(nodeId) || { x: 0, y: 0 };

    return {
      id: nodeId,
      name: fallbackName,
      offenseType: metadata?.offenseType || 'Sin delito',
      caseDateLabel: metadata?.caseDateLabel || 'Sin fecha',
      zone: metadata?.zone || 'Sin zona',
      x: position.x,
      y: position.y,
    };
  });

  const connections = currentConnections
    .filter((edge) => memberSet.has(edge.a) && memberSet.has(edge.b))
    .map((edge) => ({
      key: getPairKey(edge.a, edge.b),
      sourceId: edge.a,
      targetId: edge.b,
      sourceName: caseNameById.get(String(edge.a)) || String(edge.a),
      targetName: caseNameById.get(String(edge.b)) || String(edge.b),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    finalizedAt: Date.now(),
    groupName: group.name,
    relationType: group.relationType,
    color: group.color,
    nodes,
    cases: nodes,
    connections,
  };
}

function buildCompactGraphLayout(nodes, width = 320, height = 150) {
  if (!nodes.length) {
    return { nodes: [], width, height };
  }

  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const padding = 18;

  return {
    width,
    height,
    nodes: nodes.map((node) => ({
      ...node,
      x: padding + ((node.x - minX) / spanX) * Math.max(1, width - padding * 2),
      y: padding + ((node.y - minY) / spanY) * Math.max(1, height - padding * 2),
    })),
  };
}

function DashboardInvestigator({ token }) {
  const boardRef = useRef(null);
  const groupedRegionsRef = useRef([]);
  const { usuario, logout, completarPrimeraVez } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(() => {
    return usuario?.primera_vez !== false;
  });
  
  useEffect(() => {
    if (usuario) {
      setShowWelcome(usuario.primera_vez !== false);
    }
  }, [usuario]);

  const [showInstructions, setShowInstructions] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [carpetas, setCarpetas] = useState([]);
  const [documentsByCase, setDocumentsByCase] = useState({});
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isCaseSummaryOpen, setIsCaseSummaryOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('lobby');
  const [configData, setConfigData] = useState({ tiempo_limite_minutos: 180 });


  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [velocities, setVelocities] = useState({});
  const [connections, setConnections] = useState([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [finalizedGroups, setFinalizedGroups] = useState({});
  const [pendingConnection, setPendingConnection] = useState(null);
  const [connectionJustificationDraft, setConnectionJustificationDraft] = useState('');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  const [startTimestamp, setStartTimestamp] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [groupMeta, setGroupMeta] = useState({});
  const [groupJustifications, setGroupJustifications] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [investigationFinished, setInvestigationFinished] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [disagreementReasons, setDisagreementReasons] = useState({});
  const [planAccion, setPlanAccion] = useState(buildInitialPlanAccionState());
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackChecking, setFeedbackChecking] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingPlanAccion, setSavingPlanAccion] = useState(false);
  const [savingJustifications, setSavingJustifications] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const response = await axios.get(`${API_URL}/configuracion`, {
          headers: authHeaders,
        });
        if (response.data) {
          setConfigData(response.data);
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    };
    if (token) {
      cargarConfiguracion();
    }
  }, [authHeaders, token]);

  useEffect(() => {
    if (investigationFinished || validationResult) {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [investigationFinished, validationResult]);

  useEffect(() => {
    if (showWelcome) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showWelcome]);

  useEffect(() => {
    let cancelled = false;

    const loadCases = async () => {
      setLoadingCases(true);
      try {
        const response = await axios.get(`${API_URL}/carpetas`, { headers: authHeaders });
        if (cancelled) {
          return;
        }

        const cases = response.data || [];
        setCarpetas(cases);

        const board = boardRef.current;
        const boardWidth = Math.max(700, board?.clientWidth || 980);
        const boardHeight = Math.max(420, board?.clientHeight || 600);

        const generatedNodes = cases.map((caseItem, index) => ({
          id: caseItem.id,
          label: caseItem.nombre,
          x: 90 + ((index * 109) % Math.max(220, boardWidth - 200)),
          y: 90 + ((index * 83) % Math.max(180, boardHeight - 200)),
        }));

        const generatedVelocities = {};
        cases.forEach((caseItem, index) => {
          const speedX = (index % 2 === 0 ? 1 : -1) * (0.75 + (index % 5) * 0.12);
          const speedY = (index % 2 === 1 ? 1 : -1) * (0.82 + (index % 7) * 0.1);
          generatedVelocities[caseItem.id] = { vx: speedX, vy: speedY };
        });

        setNodes(generatedNodes);
        setVelocities(generatedVelocities);
      } catch (requestError) {
        console.error('Error loading cases for investigator:', requestError);
        if (!cancelled) {
          setError('No fue posible cargar las carpetas para el fiscal.');
        }
      } finally {
        if (!cancelled) {
          setLoadingCases(false);
        }
      }
    };

    loadCases();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    if (!selectedCaseId || documentsByCase[selectedCaseId]) {
      return;
    }

    let cancelled = false;

    const loadDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const response = await axios.get(`${API_URL}/documentos/carpeta/${selectedCaseId}`, {
          headers: authHeaders,
        });

        if (!cancelled) {
          setDocumentsByCase((current) => ({ ...current, [selectedCaseId]: response.data || [] }));
        }
      } catch (requestError) {
        console.error('Error loading documents for case:', requestError);
        if (!cancelled) {
          setError('No fue posible cargar documentos del caso seleccionado.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [selectedCaseId, authHeaders, documentsByCase]);

  const finalizedNodeIds = useMemo(() => {
    const ids = new Set();
    Object.values(finalizedGroups).forEach((group) => {
      (group.nodes || group.cases || []).forEach((node) => {
        ids.add(String(node.id));
      });
    });
    return ids;
  }, [finalizedGroups]);

  const activeNodes = useMemo(() => nodes.filter((node) => !finalizedNodeIds.has(String(node.id))), [nodes, finalizedNodeIds]);

  const activeConnections = useMemo(
    () => connections.filter((edge) => !finalizedNodeIds.has(String(edge.a)) && !finalizedNodeIds.has(String(edge.b))),
    [connections, finalizedNodeIds]
  );

  const activeNodeById = useMemo(() => {
    const map = new Map();
    activeNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [activeNodes]);

  const activeNodeIds = useMemo(() => activeNodes.map((node) => node.id), [activeNodes]);

  useEffect(() => {
    if (investigationFinished || activeNodes.length < 2) {
      return undefined;
    }

    const activeNodeIdSet = new Set(activeNodeIds.map((nodeId) => String(nodeId)));

    const interval = setInterval(() => {
      const board = boardRef.current;
      const boardWidth = Math.max(700, board?.clientWidth || 980);
      const boardHeight = Math.max(420, board?.clientHeight || 600);
      const minX = NODE_RADIUS;
      const maxX = boardWidth - NODE_RADIUS;
      const minY = NODE_RADIUS;
      const maxY = boardHeight - NODE_RADIUS;
      const minDistance = NODE_RADIUS * 2;
      const nextVelocities = { ...velocities };
      const protectedRegions = groupedRegionsRef.current;
      const regionByNodeId = new Map();

      protectedRegions.forEach((region) => {
        region.ids.forEach((nodeId) => {
          regionByNodeId.set(nodeId, region);
        });
      });

      const getRegionVelocity = (region, fallbackNodeId) => {
        if (!region || region.ids.length <= 1) {
          return nextVelocities[fallbackNodeId] || { vx: 1, vy: 1 };
        }

        const sharedVelocity = region.ids.reduce(
          (accumulator, nodeId) => {
            const speed = nextVelocities[nodeId] || { vx: 1, vy: 1 };
            return {
              vx: accumulator.vx + speed.vx,
              vy: accumulator.vy + speed.vy,
            };
          },
          { vx: 0, vy: 0 }
        );

        return {
          vx: sharedVelocity.vx / region.ids.length,
          vy: sharedVelocity.vy / region.ids.length,
        };
      };

      setNodes((currentNodes) => {
        const movedNodes = currentNodes.map((node) => {
          if (!activeNodeIdSet.has(String(node.id))) {
            return node;
          }

          const region = regionByNodeId.get(node.id);
          const speed = getRegionVelocity(region, node.id);
          let nextX = node.x + speed.vx;
          let nextY = node.y + speed.vy;
          let vx = speed.vx;
          let vy = speed.vy;

          if (nextX < minX || nextX > maxX) {
            vx = -vx;
            nextX = Math.min(Math.max(minX, nextX), maxX);
          }
          if (nextY < minY || nextY > maxY) {
            vy = -vy;
            nextY = Math.min(Math.max(minY, nextY), maxY);
          }

          for (let regionIndex = 0; regionIndex < protectedRegions.length; regionIndex += 1) {
            const region = protectedRegions[regionIndex];
            if (region.ids.includes(node.id)) {
              continue;
            }

            const regionLeft = region.x;
            const regionRight = region.x + region.width;
            const regionTop = region.y;
            const regionBottom = region.y + region.height;
            const insideRegion = nextX > regionLeft && nextX < regionRight && nextY > regionTop && nextY < regionBottom;

            if (!insideRegion) {
              continue;
            }

            const distLeft = Math.abs(nextX - regionLeft);
            const distRight = Math.abs(regionRight - nextX);
            const distTop = Math.abs(nextY - regionTop);
            const distBottom = Math.abs(regionBottom - nextY);
            const nearest = Math.min(distLeft, distRight, distTop, distBottom);

            if (nearest === distLeft) {
              nextX = Math.max(minX, regionLeft - 1);
              vx = -Math.abs(vx);
            } else if (nearest === distRight) {
              nextX = Math.min(maxX, regionRight + 1);
              vx = Math.abs(vx);
            } else if (nearest === distTop) {
              nextY = Math.max(minY, regionTop - 1);
              vy = -Math.abs(vy);
            } else {
              nextY = Math.min(maxY, regionBottom + 1);
              vy = Math.abs(vy);
            }
          }

          nextVelocities[node.id] = { vx, vy };

          return {
            ...node,
            x: nextX,
            y: nextY,
          };
        });

        const pushRegion = (region, deltaX, deltaY, resolvedVelocities) => {
          if (!region) {
            return;
          }

          region.ids.forEach((nodeId) => {
            if (!activeNodeIdSet.has(String(nodeId))) {
              return;
            }

            const node = movedNodes.find((item) => item.id === nodeId);
            if (!node) {
              return;
            }

            node.x = Math.min(Math.max(minX, node.x + deltaX), maxX);
            node.y = Math.min(Math.max(minY, node.y + deltaY), maxY);
          });

          region.ids.forEach((nodeId) => {
            if (!activeNodeIdSet.has(String(nodeId))) {
              return;
            }

            const currentVelocity = resolvedVelocities[nodeId] || { vx: 1, vy: 1 };
            resolvedVelocities[nodeId] = {
              vx: deltaX !== 0 ? -currentVelocity.vx : currentVelocity.vx,
              vy: deltaY !== 0 ? -currentVelocity.vy : currentVelocity.vy,
            };
          });
        };

        for (let i = 0; i < movedNodes.length; i += 1) {
          for (let j = i + 1; j < movedNodes.length; j += 1) {
            const firstNode = movedNodes[i];
            const secondNode = movedNodes[j];
            const firstRegion = regionByNodeId.get(firstNode.id);
            const secondRegion = regionByNodeId.get(secondNode.id);

            if (firstRegion && secondRegion && firstRegion.key === secondRegion.key) {
              continue;
            }

            let dx = secondNode.x - firstNode.x;
            let dy = secondNode.y - firstNode.y;
            let distance = Math.hypot(dx, dy);

            if (distance >= minDistance) {
              continue;
            }

            if (distance < 0.0001) {
              dx = 0.0001;
              dy = 0;
              distance = 0.0001;
            }

            const normalX = dx / distance;
            const normalY = dy / distance;
            const overlap = minDistance - distance;

            firstNode.x = Math.min(Math.max(minX, firstNode.x - normalX * (overlap / 2)), maxX);
            firstNode.y = Math.min(Math.max(minY, firstNode.y - normalY * (overlap / 2)), maxY);
            secondNode.x = Math.min(Math.max(minX, secondNode.x + normalX * (overlap / 2)), maxX);
            secondNode.y = Math.min(Math.max(minY, secondNode.y + normalY * (overlap / 2)), maxY);

            const velocityA = nextVelocities[firstNode.id] || { vx: 1, vy: 1 };
            const velocityB = nextVelocities[secondNode.id] || { vx: 1, vy: 1 };
            const relativeVX = velocityB.vx - velocityA.vx;
            const relativeVY = velocityB.vy - velocityA.vy;
            const velocityAlongNormal = relativeVX * normalX + relativeVY * normalY;

            if (velocityAlongNormal < 0) {
              const impulse = -velocityAlongNormal;
              nextVelocities[firstNode.id] = {
                vx: velocityA.vx - impulse * normalX,
                vy: velocityA.vy - impulse * normalY,
              };
              nextVelocities[secondNode.id] = {
                vx: velocityB.vx + impulse * normalX,
                vy: velocityB.vy + impulse * normalY,
              };
            }
          }
        }

        for (let i = 0; i < protectedRegions.length; i += 1) {
          for (let j = i + 1; j < protectedRegions.length; j += 1) {
            const firstRegion = protectedRegions[i];
            const secondRegion = protectedRegions[j];

            const firstLeft = firstRegion.x;
            const firstRight = firstRegion.x + firstRegion.width;
            const firstTop = firstRegion.y;
            const firstBottom = firstRegion.y + firstRegion.height;

            const secondLeft = secondRegion.x;
            const secondRight = secondRegion.x + secondRegion.width;
            const secondTop = secondRegion.y;
            const secondBottom = secondRegion.y + secondRegion.height;

            const overlapX = Math.min(firstRight, secondRight) - Math.max(firstLeft, secondLeft);
            const overlapY = Math.min(firstBottom, secondBottom) - Math.max(firstTop, secondTop);

            if (overlapX <= 0 || overlapY <= 0) {
              continue;
            }

            if (overlapX < overlapY) {
              const shiftX = overlapX / 2 + 1;
              const direction = firstLeft <= secondLeft ? -1 : 1;
              pushRegion(firstRegion, direction * shiftX, 0, nextVelocities);
              pushRegion(secondRegion, -direction * shiftX, 0, nextVelocities);
            } else {
              const shiftY = overlapY / 2 + 1;
              const direction = firstTop <= secondTop ? -1 : 1;
              pushRegion(firstRegion, 0, direction * shiftY, nextVelocities);
              pushRegion(secondRegion, 0, -direction * shiftY, nextVelocities);
            }
          }
        }

        setVelocities(nextVelocities);

        return movedNodes;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [velocities, activeNodes.length, activeNodeIds, investigationFinished]);

  const selectedCase = useMemo(
    () => carpetas.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [carpetas, selectedCaseId]
  );

  useEffect(() => {
    if (!selectedCase && isCaseSummaryOpen) {
      setIsCaseSummaryOpen(false);
      setSelectedDocument(null);
    }
  }, [selectedCase, isCaseSummaryOpen]);

  const selectedCaseDocuments = useMemo(
    () => documentsByCase[selectedCaseId] || [],
    [documentsByCase, selectedCaseId]
  );

  const caseMetadataById = useMemo(() => {
    const map = new Map();
    carpetas.forEach((caseItem, index) => {
      map.set(caseItem.id, buildCaseMetadata(caseItem, index));
    });
    return map;
  }, [carpetas]);

  const selectedCaseMetadata = useMemo(() => {
    if (!selectedCase) {
      return null;
    }
    return caseMetadataById.get(selectedCase.id) || null;
  }, [selectedCase, caseMetadataById]);



  const caseNameById = useMemo(() => {
    const map = new Map();
    carpetas.forEach((caseItem) => {
      map.set(String(caseItem.id), caseItem.nombre || String(caseItem.id));
    });
    return map;
  }, [carpetas]);

  const buildGroupGuessesPayload = () => {
    const payload = {};
    componentsWithMeta.forEach((group) => {
      payload[group.key] = groupMeta[group.key]?.relationType || group.relationType || 'modalidad';
    });
    return payload;
  };

  const buildGroupJustificationsPayload = () => {
    const payload = {};
    componentsWithMeta.forEach((group) => {
      payload[group.key] = String(groupJustifications[group.key] || '').trim();
    });
    return payload;
  };

  const buildPlanAccionPayload = () => {
    return PLAN_ACCION_OPTIONS.filter((option) => Boolean(planAccion[option.key]?.selected)).map((option) => ({
      opcion: option.key,
      etiqueta: option.label,
      cual: String(planAccion[option.key]?.cual || '').trim(),
      justificacion: String(planAccion[option.key]?.justificacion || '').trim(),
    }));
  };

  const validatePlanAccionPayload = (payload = buildPlanAccionPayload()) => {
    for (const item of payload) {
      if (!item.justificacion) {
        const option = PLAN_ACCION_OPTIONS.find((candidate) => candidate.key === item.opcion);
        return `Debes agregar justificacion para "${option?.label || item.opcion}".`;
      }

      const option = PLAN_ACCION_OPTIONS.find((candidate) => candidate.key === item.opcion);
      if (option?.requiresCual && !item.cual) {
        return `Debes diligenciar "${option.cualLabel}" para "${option.label}".`;
      }
    }

    return '';
  };

  const updatePlanAccionOption = (optionKey, patch) => {
    setPlanAccion((current) => ({
      ...current,
      [optionKey]: {
        ...(current[optionKey] || { selected: false, cual: '', justificacion: '' }),
        ...patch,
      },
    }));
  };

  const buildJustificacionesPayload = () => {
    return connections
      .map((edge) => {
        const pairKey = getPairKey(edge.a, edge.b);
        return {
          pairKey,
          pairLabel: formatPairLabel(pairKey, caseNameById),
          reason: String(disagreementReasons[pairKey] || '').trim(),
        };
      })
      .filter((item) => item.reason.length > 0);
  };

  const hydrateFeedback = (feedback) => {
    if (!feedback) {
      return;
    }

    setValidationResult({
      expectedTotal: feedback.expectedTotal,
      userTotal: feedback.userTotal,
      score: feedback.score,
      correct: feedback.correct || [],
      incorrect: feedback.incorrect || [],
      missing: feedback.missing || [],
    });

    const reasonsMap = {};
    (feedback.justificaciones || []).forEach((item) => {
      reasonsMap[item.pair_key] = item.reason;
    });

    const nextPlanAccion = buildInitialPlanAccionState();
    (feedback.planAccion || []).forEach((item) => {
      if (!item?.opcion || !nextPlanAccion[item.opcion]) {
        return;
      }

      nextPlanAccion[item.opcion] = {
        selected: true,
        cual: String(item.cual || ''),
        justificacion: String(item.justificacion || ''),
      };
    });

    setDisagreementReasons(reasonsMap);
    setPlanAccion(nextPlanAccion);
    setFeedbackSubmitted(true);
    setInvestigationFinished(true);
    setSelectedNodeIds([]);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSavedFeedback = async () => {
      setFeedbackChecking(true);
      try {
        const response = await axios.get(`${API_URL}/investigacion-feedback/me`, { headers: authHeaders });
        if (cancelled) {
          return;
        }

        if (response.data?.hasSubmitted && response.data.feedback) {
          hydrateFeedback(response.data.feedback);
        }
      } catch (requestError) {
        console.error('Error consultando feedback guardado:', requestError);
      } finally {
        if (!cancelled) {
          setFeedbackChecking(false);
        }
      }
    };

    loadSavedFeedback();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const components = useMemo(() => buildComponents(activeNodeIds, activeConnections), [activeNodeIds, activeConnections]);

  const groupedRegions = useMemo(() => {
    return components.map((component) => {
      const key = component.join('__');
      const meta = groupMeta[key];
      const componentNodes = component
        .map((nodeId) => activeNodeById.get(nodeId))
        .filter(Boolean);

      const xs = componentNodes.map((node) => node.x);
      const ys = componentNodes.map((node) => node.y);
      const minX = Math.min(...xs) - NODE_RADIUS - 18;
      const maxX = Math.max(...xs) + NODE_RADIUS + 18;
      const minY = Math.min(...ys) - NODE_RADIUS - 18;
      const maxY = Math.max(...ys) + NODE_RADIUS + 18;

      return {
        key,
        ids: component,
        x: minX,
        y: minY,
        width: Math.max(120, maxX - minX),
        height: Math.max(120, maxY - minY),
        color: meta?.color || getDefaultGroupColor(component[0]?.length ? component.length - 1 : 0),
        name: meta?.name || `Grupo ${component.length}`,
      };
    });
  }, [components, groupMeta, activeNodeById]);
  useEffect(() => {
    groupedRegionsRef.current = groupedRegions;
  }, [groupedRegions]);

  const componentsWithMeta = useMemo(() => {
    return components.map((component, index) => {
      const key = component.join('__');
      const componentNodes = component
        .map((nodeId) => activeNodeById.get(nodeId))
        .filter(Boolean);

      return {
        key,
        ids: component,
        nodes: componentNodes,
        index,
        color: groupMeta[key]?.color || getDefaultGroupColor(index),
        name: groupMeta[key]?.name || `Grupo ${index + 1}`,
        relationType: groupMeta[key]?.relationType || 'modalidad',
      };
    });
  }, [components, groupMeta, activeNodeById]);
  useEffect(() => {
    if (componentsWithMeta.length === 0) {
      return;
    }

    setGroupMeta((current) => {
      let changed = false;
      const next = { ...current };
      componentsWithMeta.forEach((component) => {
        if (!next[component.key]) {
          next[component.key] = {
            name: `Grupo ${component.index + 1}`,
            relationType: 'modalidad',
            color: component.color,
          };
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [componentsWithMeta]);

  const onNodeClick = (nodeId) => {
    if (investigationFinished || validationResult) {
      return;
    }

    setError('');
    if (selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds((current) => current.filter((id) => id !== nodeId));
      return;
    }

    if (selectedNodeIds.length >= 2) {
      setSelectedNodeIds([nodeId]);
      return;
    }

    const nextSelection = [...selectedNodeIds, nodeId];
    setSelectedNodeIds(nextSelection);

    if (nextSelection.length >= 2) {
      const candidateEdge = { a: nextSelection[0], b: nextSelection[1] };
      const key = getPairKey(candidateEdge.a, candidateEdge.b);

      if (connections.some((currentEdge) => getPairKey(currentEdge.a, currentEdge.b) === key)) {
        setSelectedNodeIds([]);
        return;
      }

      setPendingConnection(candidateEdge);
      setConnectionJustificationDraft('');
      setIsConnectionModalOpen(true);
      setSelectedNodeIds([]);
    }
  };

  const closeConnectionJustificationModal = () => {
    setIsConnectionModalOpen(false);
    setPendingConnection(null);
    setConnectionJustificationDraft('');
  };

  const confirmPendingConnection = () => {
    if (!pendingConnection) {
      return;
    }

    const justification = String(connectionJustificationDraft || '').trim();
    if (!justification) {
      setError('Debes escribir una justificación para asociar los dos nodos.');
      return;
    }

    const pairKey = getPairKey(pendingConnection.a, pendingConnection.b);
    setError('');
    setConnections((current) => {
      if (current.some((edge) => getPairKey(edge.a, edge.b) === pairKey)) {
        return current;
      }

      return [...current, pendingConnection];
    });
    setDisagreementReasons((current) => ({
      ...current,
      [pairKey]: justification,
    }));
    closeConnectionJustificationModal();
  };

  const removeConnection = (edgeKey) => {
    if (investigationFinished || validationResult) {
      return;
    }

    const [nodeAId, nodeBId] = String(edgeKey).split('__');

    setConnections((current) => {
      const nextConnections = current.filter((edge) => getPairKey(edge.a, edge.b) !== edgeKey);
      const nextComponents = buildComponents(activeNodeIds, nextConnections);
      const affectedComponents = nextComponents.filter((component) => component.includes(nodeAId) || component.includes(nodeBId));

      if (affectedComponents.length >= 2) {
        const nodePositions = new Map(activeNodes.map((node) => [node.id, node]));
        const endpointA = nodePositions.get(nodeAId);
        const endpointB = nodePositions.get(nodeBId);

        if (endpointA && endpointB) {
          const midpointX = (endpointA.x + endpointB.x) / 2;
          const midpointY = (endpointA.y + endpointB.y) / 2;
          const releaseDistance = NODE_RADIUS * 1.2;

          setNodes((currentNodes) => {
            return currentNodes.map((node) => {
              const component = affectedComponents.find((item) => item.includes(node.id));
              if (!component) {
                return node;
              }

              const componentNodes = component
                .map((nodeId) => nodePositions.get(nodeId))
                .filter(Boolean);

              const centroid = componentNodes.reduce(
                (accumulator, currentNode) => ({
                  x: accumulator.x + currentNode.x,
                  y: accumulator.y + currentNode.y,
                }),
                { x: 0, y: 0 }
              );

              const centerX = centroid.x / Math.max(1, componentNodes.length);
              const centerY = centroid.y / Math.max(1, componentNodes.length);
              let directionX = centerX - midpointX;
              let directionY = centerY - midpointY;
              let distance = Math.hypot(directionX, directionY);

              if (distance < 0.001) {
                directionX = node.id === nodeAId ? -1 : 1;
                directionY = node.id === nodeAId ? -0.25 : 0.25;
                distance = Math.hypot(directionX, directionY);
              }

              const normalizedX = directionX / distance;
              const normalizedY = directionY / distance;

              return {
                ...node,
                x: Math.min(Math.max(NODE_RADIUS, node.x + normalizedX * releaseDistance), Math.max(NODE_RADIUS, (boardRef.current?.clientWidth || 980) - NODE_RADIUS)),
                y: Math.min(Math.max(NODE_RADIUS, node.y + normalizedY * releaseDistance), Math.max(NODE_RADIUS, (boardRef.current?.clientHeight || 600) - NODE_RADIUS)),
              };
            });
          });

          setVelocities((currentVelocities) => {
            const nextVelocities = { ...currentVelocities };

            affectedComponents.forEach((component) => {
              const componentNodes = component
                .map((nodeId) => nodePositions.get(nodeId))
                .filter(Boolean);

              const centroid = componentNodes.reduce(
                (accumulator, currentNode) => ({
                  x: accumulator.x + currentNode.x,
                  y: accumulator.y + currentNode.y,
                }),
                { x: 0, y: 0 }
              );

              const centerX = centroid.x / Math.max(1, componentNodes.length);
              const centerY = centroid.y / Math.max(1, componentNodes.length);
              let directionX = centerX - midpointX;
              let directionY = centerY - midpointY;
              let distance = Math.hypot(directionX, directionY);

              if (distance < 0.001) {
                directionX = component.includes(nodeAId) ? -1 : 1;
                directionY = component.includes(nodeAId) ? -0.25 : 0.25;
                distance = Math.hypot(directionX, directionY);
              }

              const normalizedX = directionX / distance;
              const normalizedY = directionY / distance;

              component.forEach((nodeId) => {
                nextVelocities[nodeId] = {
                  vx: normalizedX * 1.25,
                  vy: normalizedY * 1.25,
                };
              });
            });

            return nextVelocities;
          });
        }
      }

      return nextConnections;
    });

    setSelectedNodeIds((current) => current.filter((nodeId) => nodeId !== nodeAId && nodeId !== nodeBId));
  };

  const updateGroupMeta = (groupKey, patch) => {
    setGroupMeta((current) => ({
      ...current,
      [groupKey]: {
        ...(current[groupKey] || { name: '', relationType: 'modalidad' }),
        ...patch,
      },
    }));
  };

  const finalizeGroup = (group) => {
    setFinalizedGroups((current) => {
      if (current[group.key]) {
        return current;
      }

      const currentGroupNodes = group.nodes && group.nodes.length > 0 ? group.nodes : activeNodes.filter((node) => group.ids.includes(node.id));

      return {
        ...current,
        [group.key]: buildGroupSnapshot(
          { ...group, nodes: currentGroupNodes },
          connections,
          caseNameById,
          caseMetadataById
        ),
      };
    });
    setSelectedNodeIds([]);
  };

  const getGroupColor = (groupKey, index = 0) => {
    return groupMeta[groupKey]?.color || getDefaultGroupColor(index);
  };

  const saveInitialFeedback = async (result) => {
    setSavingFeedback(true);
    try {
      const planPayload = buildPlanAccionPayload();
      const response = await axios.post(
        `${API_URL}/investigacion-feedback`,
        {
          score: result.score,
          expectedTotal: result.expectedTotal,
          userTotal: result.userTotal,
          correct: result.correct,
          incorrect: result.incorrect,
          missing: result.missing,
          justificaciones: buildJustificacionesPayload(),
          planAccion: planPayload,
          groupGuesses: buildGroupGuessesPayload(),
          groupJustifications: buildGroupJustificationsPayload(),
        },
        { headers: authHeaders }
      );

      hydrateFeedback(response.data.feedback);
      setFeedbackSubmitted(true);
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 409 && requestError.response?.data?.feedback) {
        hydrateFeedback(requestError.response.data.feedback);
        setFeedbackSubmitted(true);
        return true;
      }

      console.error('Error guardando feedback inicial:', requestError);
      setError('No fue posible guardar tu feedback final.');
      return false;
    } finally {
      setSavingFeedback(false);
    }
  };

  const savePlanAccionAndJustificaciones = async () => {
    if (!validationResult || !feedbackSubmitted) {
      return;
    }

    const planPayload = buildPlanAccionPayload();
    const validationError = validatePlanAccionPayload(planPayload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingPlanAccion(true);
    try {
      const response = await axios.put(
        `${API_URL}/investigacion-feedback/me/justificaciones`,
        {
          justificaciones: buildJustificacionesPayload(),
          planAccion: planPayload,
        },
        { headers: authHeaders }
      );

      hydrateFeedback(response.data.feedback);
      setError('');
    } catch (requestError) {
      console.error('Error guardando plan de accion y justificaciones:', requestError);
      setError('No fue posible guardar el plan de accion global.');
    } finally {
      setSavingPlanAccion(false);
    }
  };


  const downloadFeedbackPdf = () => {
    if (!validationResult) {
      return;
    }

    const doc = new jsPDF();
    const lineHeight = 7;
    let y = 16;

    const writeLine = (text, size = 11, color = [20, 20, 20]) => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text), 178);
      lines.forEach((line) => {
        if (y > 282) {
          doc.addPage();
          y = 16;
        }
        doc.text(line, 16, y);
        y += lineHeight;
      });
    };

    writeLine('Feedback Fiscal - NEXUS DAE', 15, [0, 90, 140]);
    writeLine(`Fiscal: ${usuario?.nombre || 'Sin nombre'}`);
    writeLine(`Fecha: ${new Date().toLocaleString()}`);
    writeLine(`Total de Conexiones Trazadas: ${connections.length}`);

    y += 3;
    writeLine('Conexiones Trazadas:', 12, [60, 60, 60]);
    if (connections.length === 0) {
      writeLine('Ninguna.');
    } else {
      connections.forEach((edge) => {
        const pairKey = getPairKey(edge.a, edge.b);
        const pairLabel = formatPairLabel(pairKey, caseNameById);
        const reason = disagreementReasons[pairKey] || '';
        if (reason.trim() !== '') {
          writeLine(`- [Conexado] ${pairLabel}`, 11, [0, 100, 0]);
          writeLine(`  Motivo: ${reason}`);
        } else {
          writeLine(`- [Asociado] ${pairLabel}`, 11, [100, 100, 100]);
        }
      });
    }

    const safeName = (usuario?.nombre || 'fiscal').replace(/\s+/g, '-').toLowerCase();
    doc.save(`feedback-${safeName}.pdf`);
  };

  const finishInvestigation = async () => {
    if (validationResult || feedbackSubmitted) {
      setError('Esta prueba ya fue presentada. Solo puedes revisar y descargar tu feedback.');
      return;
    }

    if (connections.length === 0) {
      setError('Debes crear al menos una conexion antes de terminar la investigacion.');
      return;
    }

    const missingJustification = connections.find((edge) => {
      const pairKey = getPairKey(edge.a, edge.b);
      return String(disagreementReasons[pairKey] || '').trim().length === 0;
    });

    if (missingJustification) {
      const source = carpetas.find((caseItem) => caseItem.id === missingJustification.a);
      const target = carpetas.find((caseItem) => caseItem.id === missingJustification.b);
      setError(`Debes justificar la asociación entre ${source?.nombre || missingJustification.a} y ${target?.nombre || missingJustification.b}.`);
      return;
    }

    setError('');
    setFinishing(true);

    try {
      const userPairs = new Set(connections.map((edge) => getPairKey(edge.a, edge.b)));

      setValidationResult({
        expectedTotal: 0,
        userTotal: userPairs.size,
        score: 0,
        correct: [],
        incorrect: [],
        missing: [],
      });
      setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
      setInvestigationFinished(true);
      setSelectedNodeIds([]);
      setIsFeedbackModalOpen(true);

      await saveInitialFeedback({
        expectedTotal: 0,
        userTotal: userPairs.size,
        score: 0,
        correct: [],
        incorrect: [],
        missing: [],
      });
    } catch (requestError) {
      console.error('Error finishing investigation:', requestError);
      setError('No fue posible validar la investigacion en este momento.');
    } finally {
      setFinishing(false);
    }
  };

  const restartInvestigation = () => {
    if (validationResult || feedbackSubmitted) {
      setError('La prueba ya fue presentada. No se puede reiniciar.');
      return;
    }

    setConnections([]);
    setSelectedNodeIds([]);
    setValidationResult(null);
    setDisagreementReasons({});
    setGroupJustifications({});
    setPlanAccion(buildInitialPlanAccionState());
    setInvestigationFinished(false);
    setStartTimestamp(Date.now());
    setElapsedSeconds(0);
  };

  const handleOpenCaseDetails = (caseId) => {
    setSelectedCaseId(caseId);
    setSelectedDocument(null);
    setIsCaseSummaryOpen(true);
  };

  const updateDisagreement = (pairKey, text) => {
    setDisagreementReasons((current) => ({ ...current, [pairKey]: text }));
  };

  return (
    <>
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
                Has ingresado al simulador de investigación estructural de la Fiscalía. Prepárate para analizar casos complejos y conectar nexos delictivos de manera estratégica.
              </p>
            </div>
 
            {/* Action Button */}
            <button
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

      {showInstructions && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-no-repeat bg-cover bg-center p-4 md:p-8 overflow-hidden text-slate-100"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(6, 10, 15, 0.97) 0%, rgba(6, 10, 15, 0.94) 100%), url(${fondoLogin})`,
          }}
        >
          {/* Main Wizard Card */}
          <div className="flex h-full max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            
            {/* Sidebar */}
            <div className="hidden md:flex w-80 flex-col border-r border-cyan-500/20 bg-slate-950/40 p-6 justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                    Inducción Fiscal
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400">NEXUS DAE</p>
                </div>
                
                <div className="relative pl-8 space-y-8 py-2">
                  {/* Container for the line to restrict its bounds */}
                  <div className="absolute left-3.5 top-[14px] bottom-[14px] w-[3px]">
                    {/* Background Line */}
                    <div className="absolute inset-0 bg-slate-800 rounded-full" />
                    
                    {/* Active Glowing Line */}
                    <div 
                      className="absolute top-0 w-full bg-gradient-to-b from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-500 ease-out rounded-full"
                      style={{
                        height: `${((currentStep - 1) / 3) * 100}%`
                      }}
                    />
                  </div>
                  
                  {[
                    { id: 1, name: 'Bienvenida' },
                    { id: 2, name: '¿Qué es NEXUS?' },
                    { id: 3, name: 'Cada decisión importa' },
                    { id: 4, name: 'Tu objetivo' }
                  ].map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <div 
                        key={step.id} 
                        className="relative flex items-center gap-4 transition duration-300 animate-welcome-fade"
                      >
                        {/* Point/Bullet */}
                        <div className={`absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-mono font-bold transition-all duration-500 ${
                          isActive 
                            ? 'border-cyan-400 bg-slate-950 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-110'
                            : isCompleted
                              ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              : 'border-slate-700 bg-slate-900 text-slate-500'
                        }`}>
                          {step.id}
                        </div>
                        
                        {/* Label */}
                        <span className={`font-mono text-xs transition-colors duration-300 ${
                          isActive 
                            ? 'text-cyan-300 font-bold'
                            : isCompleted
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                        }`}>
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="rounded-lg border border-slate-500/20 bg-slate-900/40 p-3">
                <p className="font-mono text-[9px] text-slate-400/80 leading-normal">
                  Este manual de inducción te preparará para asumir el cargo. Sigue los pasos indicados.
                </p>
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden bg-slate-900/40">
              
              {/* Content viewport */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                
                {/* Step 1: Bienvenida al Despacho */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiShield size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Bienvenido al Despacho</h2>
                        <p className="text-sm text-slate-300/80">Dispone de tres horas para revisar su despacho y tomar las primeras decisiones.</p>
                      </div>
                    </div>
                    
                    {/* Alert Box */}
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-200 font-semibold animate-stagger-2">
                      💡 Su despacho es mixto, conoce de diferentes delitos y temáticas.
                    </div>
                    
                    {/* Main description box */}
                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-3">
                      Acaba de llegar a su oficina. El reloj institucional marca el inicio de su jornada y la acumulación de trabajo ya es evidente.
                    </div>
                    
                    {/* 4 Cards Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 animate-stagger-4">
                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiFileText size={18} />
                          Noticias criminales
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Más de 50 noticias criminales pendientes de revisión.</p>
                      </div>

                      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-5 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-cyan-300 text-base">
                          <FiUsers size={18} />
                          Correo institucional
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Solicitudes y comunicaciones esperando respuesta.</p>
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
                          <FiFileText size={18} />
                          Reporte de investigador
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-normal">Un investigador reporta un posible caso de criminalidad organizada.</p>
                      </div>
                    </div>
                    
                    {/* Paragraph */}
                    <p className="text-sm leading-relaxed text-slate-300 animate-stagger-5">
                      Su equipo es limitado. No cuenta con asistente, pero tiene asignado un judicante que podrá apoyarlo. El tiempo también es limitado. Y cada decisión tendrá consecuencias.
                    </p>
                  </div>
                )}
                
                {/* Step 2: ¿Que es NEXUS? */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiLink size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">¿Qué es NEXUS?</h2>
                        <p className="text-sm text-slate-300/80">Una actividad de simulación interactiva diseñada para fiscales.</p>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-2">
                      NEXUS es una actividad de simulación interactiva en la que usted asume el rol de Fiscal Delegado al frente de un despacho con una carga real de trabajo.
                    </div>
                    
                    <div className="space-y-3 animate-stagger-3">
                      <h4 className="font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">Durante el juego deberá:</h4>
                      
                      {[
                        'Priorizar investigaciones.',
                        'Analizar noticias criminales.',
                        'Determinar qué asuntos son de su competencia.',
                        'Impulsar actuaciones investigativas.',
                        'Coordinar actividades con Policía Judicial.',
                        'Atender víctimas y peticionarios.',
                        'Gestionar términos y requerimientos.',
                        'Tomar decisiones estratégicas bajo presión.'
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-5 py-3 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-md"
                        >
                          <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                          <span className="text-base text-slate-200">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Step 3: Cada decision importa */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiZap size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Cada decisión cambia la historia</h2>
                        <p className="text-sm text-slate-300/80">Los casos evolucionan según sus acciones.</p>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-2">
                      En un despacho fiscal no siempre es evidente qué caso requiere atención inmediata. Un asunto aparentemente menor puede convertirse en:
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 animate-stagger-3">
                      {[
                        'Una red de estafa',
                        'Un caso de corrupción',
                        'Una estructura criminal organizada',
                        'Una investigación de alto impacto regional'
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-5 py-4 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/40 hover:bg-slate-900/60 shadow-lg text-slate-200 animate-welcome-fade"
                        >
                          <span className="text-cyan-400 font-mono text-sm">→</span>
                          <span className="text-sm font-semibold">{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 animate-stagger-4">
                      <h4 className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">Por ello, usted deberá decidir:</h4>
                      
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { text: 'Qué investigar', border: 'border-yellow-500/40', textCol: 'text-yellow-200', bg: 'bg-yellow-500/10', icon: <FiShield size={18} /> },
                          { text: 'Qué priorizar', border: 'border-blue-500/40', textCol: 'text-blue-200', bg: 'bg-blue-500/10', icon: <FiClock size={18} /> },
                          { text: 'Qué delegar', border: 'border-emerald-500/40', textCol: 'text-emerald-200', bg: 'bg-emerald-500/10', icon: <FiUsers size={18} /> },
                          { text: 'Qué remitir', border: 'border-pink-500/40', textCol: 'text-pink-200', bg: 'bg-pink-500/10', icon: <FiFileText size={18} /> },
                          { text: 'Qué asociar con otros casos.', border: 'border-cyan-500/40', textCol: 'text-cyan-200', bg: 'bg-cyan-500/10', icon: <FiLink size={18} /> },
                          { text: 'Y qué asuntos no corresponden a su competencia.', border: 'border-orange-500/40', textCol: 'text-orange-200', bg: 'bg-orange-500/10', icon: <FiAlertTriangle size={18} /> }
                        ].map((badge, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] hover:brightness-110 shadow-md ${badge.border} ${badge.bg} ${badge.textCol}`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950/40 border border-slate-700/50">
                              {badge.icon}
                            </div>
                            <span className="leading-tight">{badge.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 4: Tu objetivo */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 animate-stagger-1">
                      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/25">
                        <FiTarget size={26} />
                      </div>
                      <div>
                        <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-50">Objetivo de NEXUS</h2>
                        <p className="text-sm text-slate-300/80">Lo que se evalúa en la simulación.</p>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border border-cyan-500/30 bg-slate-950/60 p-4 text-base text-slate-100 font-medium leading-relaxed animate-stagger-2">
                      Lograr un equilibrio sostenible entre: legalidad, eficiencia y atención real a víctimas.
                    </div>
                    
                    {/* Grid de 6 items evaluados */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger-3">
                      {[
                        { title: 'Legalidad', icon: <FiShield size={20} className="text-cyan-400" /> },
                        { title: 'Eficiencia', icon: <FiZap size={20} className="text-cyan-400" /> },
                        { title: 'Priorización', icon: <FiTarget size={20} className="text-cyan-400" /> },
                        { title: 'Atención a víctimas', icon: <FiUsers size={20} className="text-cyan-400" /> },
                        { title: 'Gestión de recursos', icon: <FiTool size={20} className="text-cyan-400" /> },
                        { title: 'Resultados investigativos', icon: <FiTrendingUp size={20} className="text-cyan-400" /> }
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

                    {/* Amber warning block */}
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm text-amber-200 font-semibold text-center italic leading-relaxed animate-stagger-4">
                      "Porque en un despacho fiscal real, resolver un caso no solo significa tomar la decisión correcta. También significa tomarla en el momento adecuado."
                    </div>

                    {/* Final Action Box */}
                    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-stagger-5 shadow-xl">
                      <div>
                        <h4 className="font-mono text-sm font-bold text-cyan-300">¡Todo listo para comenzar!</h4>
                        <p className="text-xs text-slate-300 mt-1 leading-normal">Ingrese al despacho y tome su primer turno.</p>
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
                      onClick={() => setCurrentStep((curr) => curr - 1)}
                      className="rounded-lg border border-slate-500/30 bg-slate-900/60 px-5 py-2 font-mono text-xs font-semibold text-slate-300 transition hover:bg-slate-700/50 hover:text-white"
                    >
                      ← Anterior
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (currentStep < 4) {
                      setCurrentStep((curr) => curr + 1);
                    } else {
                      completarPrimeraVez();
                      localStorage.setItem(`nexus_first_login_${usuario?.id}`, 'false');
                      setShowInstructions(false);
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

      {activeSection === 'lobby' && (
        <div 
          className="fixed inset-0 z-40 flex flex-col justify-between bg-no-repeat bg-cover bg-center text-slate-100 p-6 md:p-8"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(6, 10, 15, 0.85) 0%, rgba(6, 10, 15, 0.9) 100%), url(${fondoAdmin})`,
          }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-slate-500/30 bg-slate-950/60 px-4 py-2 font-mono text-xs font-semibold text-slate-300 transition hover:bg-slate-700/50 hover:text-white backdrop-blur-md"
            >
              ← Volver al login
            </button>

            {/* Timer Badge */}
            <div className="flex items-center gap-2 rounded-full bg-red-600/90 px-4 py-1.5 font-mono text-xs font-bold tracking-wider text-white shadow-lg border border-red-500/30 shadow-red-600/20">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              TIEMPO {formatSeconds(Math.max(0, (configData?.tiempo_limite_minutos || 180) * 60 - elapsedSeconds))}
            </div>
          </div>

          {/* Center Logo & Title */}
          <div className="flex flex-col items-center justify-center text-center space-y-6 flex-1">
            <h1 className="font-mono text-3xl md:text-4xl font-extrabold uppercase tracking-[0.25em] text-slate-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              Bienvenido a tu Despacho
            </h1>
            
            <div className="flex flex-col items-center space-y-2 animate-welcome-zoom">
              <img
                src={nexusLogo}
                alt="Logo NEXUS"
                className="h-24 w-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.35)]"
              />
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">NEXUS</span>
              <span className="text-[10px] tracking-[0.2em] font-mono text-slate-400 uppercase">Dirección de Altos Estudios</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <span className="flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-950/60 px-4 py-2 font-mono text-xs text-slate-300 backdrop-blur-sm">
                ⏱️ Jornada: <strong className="text-cyan-300">3 horas</strong>
              </span>
              <span className="flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-950/60 px-4 py-2 font-mono text-xs text-slate-300 backdrop-blur-sm">
                📂 Casos activos: <strong className="text-cyan-300">{carpetas.length}</strong>
              </span>
              <span className="flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-950/60 px-4 py-2 font-mono text-xs text-slate-300 backdrop-blur-sm">
                👥 Equipo: <strong className="text-cyan-300">1 Judicante</strong>
              </span>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full mx-auto pb-4">
            <button
              onClick={() => setActiveSection('casos')}
              className="flex flex-col items-center justify-center p-6 rounded-xl border border-cyan-500/20 bg-slate-950/80 hover:border-cyan-400 hover:bg-slate-900/90 transition-all duration-300 text-center space-y-2 group shadow-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <FiFolder size={24} />
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-cyan-300">Procesos del despacho</span>
              <span className="text-xs text-slate-400">Noticias criminales y expedientes</span>
            </button>

            <button
              onClick={() => setActiveSection('tablero')}
              className="flex flex-col items-center justify-center p-6 rounded-xl border border-cyan-500/20 bg-slate-950/80 hover:border-cyan-400 hover:bg-slate-900/90 transition-all duration-300 text-center space-y-2 group shadow-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <FiZap size={24} />
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-cyan-300">Toma de decisiones</span>
              <span className="text-xs text-slate-400">Patrones y conexiones</span>
            </button>
          </div>
        </div>
      )}

      {activeSection === 'casos' && (
        <CasesSidebarModule
          usuario={usuario}
          logout={logout}
          elapsedSeconds={elapsedSeconds}
          formatSeconds={formatSeconds}
          loadingCases={loadingCases}
          carpetas={carpetas}
          selectedCaseId={selectedCaseId}
          onSelectCase={(caseId) => {
            setSelectedCaseId(caseId);
            setSelectedDocument(null);
          }}
          caseMetadataById={caseMetadataById}
          selectedCase={selectedCase}
          selectedCaseMetadata={selectedCaseMetadata}
          loadingDocuments={loadingDocuments}
          selectedCaseDocuments={selectedCaseDocuments}
          selectedDocument={selectedDocument}
          onSelectDocument={setSelectedDocument}
          onOpenCaseDetails={handleOpenCaseDetails}
          onSwitchToBoard={() => setActiveSection('tablero')}
          onSwitchToLobby={() => setActiveSection('lobby')}
        />
      )}

      {activeSection === 'tablero' && (
        <>
        <div className="h-screen bg-investigation-bg text-slate-100">
          <header className="border-b border-cyan-500/20 bg-panel-dark px-6 py-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Modo fiscal</p>
                <h1 className="mt-1 font-mono text-lg font-semibold tracking-[0.18em] text-slate-100">Tablero de casos</h1>
                <p className="mt-1 text-xs text-slate-400">Tiempo investigando: <span className="font-mono text-cyan-200">{formatSeconds(elapsedSeconds)}</span></p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={restartInvestigation}
                  disabled={Boolean(validationResult) || feedbackSubmitted || finishing}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlay className="inline-block -translate-y-[1px]" size={14} /> Reiniciar investigación
                </button>
                <button
                  type="button"
                  onClick={finishInvestigation}
                  disabled={Boolean(validationResult) || feedbackSubmitted || finishing || savingFeedback}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiSave className="inline-block -translate-y-[1px]" size={14} /> {finishing ? 'Terminando...' : 'Terminar investigación'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('lobby')}
                  className="rounded-lg border border-slate-500/30 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/50 hover:text-white"
                >
                  Ir al Despacho
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('casos')}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  Gestión de casos
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Cerrar sesion
                </button>
              </div>
            </div>
          </header>
      <main className="h-[calc(100vh-88px)] overflow-hidden p-4">

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid h-[calc(100%-56px)] grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div ref={boardRef} className="relative h-full overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950/60">
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {groupedRegions.map((region) => (
                  <g key={region.key}>
                    <rect
                      x={region.x}
                      y={region.y}
                      width={region.width}
                      height={region.height}
                      rx="28"
                      ry="28"
                      fill={hexToRgba(region.color, 0.06)}
                      stroke={hexToRgba(region.color, 0.45)}
                      strokeDasharray="8 6"
                      strokeWidth="1.5"
                    />
                    <text
                      x={region.x + 18}
                      y={region.y + 26}
                      fill={region.color}
                      fontSize="13"
                      fontWeight="700"
                      letterSpacing="0.14em"
                    >
                      {region.name.toUpperCase()}
                    </text>
                  </g>
                ))}

                {activeConnections.map((edge) => {
                  const source = activeNodeById.get(edge.a);
                  const target = activeNodeById.get(edge.b);
                  if (!source || !target) {
                    return null;
                  }
                  const pairKey = getPairKey(edge.a, edge.b);
                  const isConexado = !!disagreementReasons[pairKey] && disagreementReasons[pairKey].trim() !== '';
                  return (
                    <line
                      key={pairKey}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isConexado ? "#fbbf24" : "#94a3b8"}
                      strokeWidth={isConexado ? "3" : "2"}
                      opacity={isConexado ? "0.9" : "0.5"}
                      strokeDasharray={isConexado ? "none" : "5, 5"}
                    />
                  );
                })}
              </svg>

              {activeNodes.map((node) => (
                (() => {
                  const caseItem = carpetas.find((c) => c.id === node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onNodeClick(node.id)}
                      title={`${caseItem?.tipo_delito || 'Caso'} | Radicado: ${caseItem?.nombre?.replace("Caso ", "")}`}
                      className={`absolute flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-center text-[10px] font-semibold leading-tight transition p-2 ${
                        selectedNodeIds.includes(node.id)
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.5)]'
                          : 'border-cyan-500/30 bg-slate-950/90 text-white hover:border-cyan-400 hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      }`}
                      style={{
                        left: node.x,
                        top: node.y,
                      }}
                    >
                      <span className="font-mono text-[9px] font-bold text-cyan-300">
                        {caseItem?.nombre?.replace("Caso ", "")}
                      </span>
                      <span className="text-[8px] text-slate-300 line-clamp-2 capitalize mt-0.5">
                        {caseItem?.tipo_delito || 'Caso'}
                      </span>
                    </button>
                  );
                })()
              ))}
            </div>

            <div className="h-full space-y-3 overflow-y-auto rounded-xl border border-slate-500/20 bg-slate-950/60 p-3">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100">
                Las conexiones se confirman con una justificación en modal. Esa justificación se guarda en el feedback final.
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conexiones ({activeConnections.length})</p>
                <div className="mt-2 space-y-1">
                  {activeConnections.length === 0 ? (
                    <p className="text-xs text-slate-400">Aun no hay enlaces creados.</p>
                  ) : (
                    activeConnections.map((edge) => {
                      const key = getPairKey(edge.a, edge.b);
                      const isConexado = !!disagreementReasons[key] && disagreementReasons[key].trim() !== '';
                      const source = carpetas.find((caseItem) => caseItem.id === edge.a);
                      const target = carpetas.find((caseItem) => caseItem.id === edge.b);
                      return (
                        <div key={key} className="rounded border border-slate-500/20 bg-slate-900/70 px-2 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-slate-200 ${isConexado ? 'text-amber-200 font-semibold' : ''}`}>
                              {source?.nombre || edge.a} - {target?.nombre || edge.b}
                            </span>
                            {!investigationFinished && (
                              <button
                                type="button"
                                onClick={() => removeConnection(key)}
                                className="text-red-300 hover:text-red-200"
                              >
                                quitar
                              </button>
                            )}
                          </div>

                          <div className="mt-2">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Justificación de asociación</p>
                            <p className="mt-1 rounded border border-slate-500/20 bg-slate-950/60 px-2 py-2 text-xs text-slate-100">
                              {disagreementReasons[key] || 'Sin justificación registrada.'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Grupos detectados</p>
                <div className="mt-2 space-y-2">
                  {componentsWithMeta.length === 0 ? (
                    <p className="text-xs text-slate-400">Selecciona 2 casos para crear un grupo completo.</p>
                  ) : (
                    componentsWithMeta.map((group) => (
                      <div
                        key={group.key}
                        className="rounded border p-2"
                        style={{
                          borderColor: hexToRgba(group.color, 0.35),
                          backgroundColor: hexToRgba(group.color, 0.12),
                        }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                          Grupo {group.index + 1}
                        </p>
                        <div className="mt-2">
                          <label className="text-[11px] text-slate-300">Asociación</label>
                          <select
                            disabled={investigationFinished}
                            value={groupMeta[group.key]?.relationType || group.relationType}
                            onChange={(event) => updateGroupMeta(group.key, { relationType: event.target.value })}
                            className="mt-1 w-full rounded border border-slate-500/20 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 outline-none"
                          >
                            <option value="modalidad">Asociado por modalidad</option>
                            <option value="patrones">Asociado por patron</option>
                          </select>
                        </div>
                        <div className="mt-2">
                          <label className="text-[11px] text-slate-300">Justificación</label>
                          <textarea
                            rows="3"
                            disabled={investigationFinished}
                            value={groupJustifications[group.key] || ''}
                            onChange={(event) =>
                              setGroupJustifications((current) => ({
                                ...current,
                                [group.key]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded border border-slate-500/20 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 outline-none"
                            placeholder="Describe por qué esta asociación es válida para el grupo detectado"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {validationResult && (
                <div className="space-y-2 border-t border-slate-600/30 pt-2">
                  <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    Esta prueba ya fue presentada. Puedes revisar el resultado en el modal y descargar tu PDF.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="w-full rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Abrir feedback
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isConnectionModalOpen && pendingConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-5 shadow-[0_0_45px_rgba(8,145,178,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Justificar asociación</p>
                <p className="mt-1 font-mono text-lg text-slate-100">{formatPairLabel(getPairKey(pendingConnection.a, pendingConnection.b), caseNameById)}</p>
              </div>
              <button
                type="button"
                onClick={closeConnectionJustificationModal}
                className="rounded-lg border border-slate-500/30 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/40"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              La conexión se agregará al tablero cuando guardes esta justificación.
            </div>

            <div className="mt-4">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Justificación</label>
              <textarea
                rows="4"
                value={connectionJustificationDraft}
                onChange={(event) => setConnectionJustificationDraft(event.target.value)}
                className="mt-2 w-full rounded border border-slate-500/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Explica por qué estos dos casos deben asociarse"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={confirmPendingConnection}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Guardar y conectar
              </button>
              <button
                type="button"
                onClick={closeConnectionJustificationModal}
                className="rounded-lg border border-slate-500/30 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isFeedbackModalOpen && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-5 shadow-[0_0_45px_rgba(8,145,178,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Feedback Final</p>
                <p className="mt-1 font-mono text-lg text-slate-100">{usuario?.nombre || 'Fiscal'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="rounded-lg border border-slate-500/30 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/40"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
                Total de Conexiones Trazadas: {connections.length}
              </div>
              <div className="max-h-60 overflow-y-auto rounded border border-slate-500/20 bg-slate-900/70 p-3">
                {connections.length === 0 ? (
                  <p className="text-xs text-slate-400">No se crearon conexiones.</p>
                ) : (
                  <ul className="space-y-2">
                    {connections.map((edge) => {
                      const pairKey = getPairKey(edge.a, edge.b);
                      const isConexado = !!disagreementReasons[pairKey] && disagreementReasons[pairKey].trim() !== '';
                      return (
                        <li key={pairKey} className="text-xs">
                          <span className={isConexado ? "text-amber-300 font-semibold" : "text-slate-300"}>
                            [{isConexado ? 'Conexado' : 'Asociado'}] {formatPairLabel(pairKey, caseNameById)}
                          </span>
                          {isConexado && (
                            <p className="mt-1 text-slate-400 pl-2 border-l border-slate-500/30">
                              {disagreementReasons[pairKey]}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Plan de acción global</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Si seleccionas una opción, debes diligenciar justificación. El campo ¿Cual? solo aplica en las opciones que lo piden.
              </p>

              <div className="mt-3 space-y-3">
                {PLAN_ACCION_OPTIONS.map((option) => {
                  const optionState = planAccion[option.key] || { selected: false, cual: '', justificacion: '' };
                  return (
                    <div key={option.key} className="rounded border border-slate-500/20 bg-slate-950/50 p-3">
                      <label className="flex items-start gap-2 text-xs text-slate-200">
                        <input
                          type="checkbox"
                          checked={optionState.selected}
                          disabled={savingPlanAccion}
                          onChange={(event) =>
                            updatePlanAccionOption(option.key, {
                              selected: event.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-500/30 bg-slate-900/80"
                        />
                        <span>{option.label}</span>
                      </label>

                      {optionState.selected && (
                        <div className="mt-2 space-y-2">
                          {option.requiresCual && (
                            <div>
                              <label className="text-[11px] text-slate-300">{option.cualLabel}</label>
                              <input
                                type="text"
                                value={optionState.cual}
                                disabled={savingPlanAccion}
                                onChange={(event) =>
                                  updatePlanAccionOption(option.key, {
                                    cual: event.target.value,
                                  })
                                }
                                className="mt-1 w-full rounded border border-slate-500/20 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 outline-none"
                                placeholder="Especifica la autoridad o despacho"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-[11px] text-slate-300">Justificación</label>
                            <textarea
                              rows="3"
                              value={optionState.justificacion}
                              disabled={savingPlanAccion}
                              onChange={(event) =>
                                updatePlanAccionOption(option.key, {
                                  justificacion: event.target.value,
                                })
                              }
                              className="mt-1 w-full rounded border border-slate-500/20 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 outline-none"
                              placeholder="Sustenta jurídicamente esta opción"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={savePlanAccionAndJustificaciones}
                disabled={savingPlanAccion || savingFeedback || !validationResult}
                className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
              >
                {savingPlanAccion ? 'Guardando plan...' : 'Guardar plan y justificaciones'}
              </button>
              <button
                type="button"
                onClick={downloadFeedbackPdf}
                disabled={!validationResult}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
              >
                <FiDownload size={14} />
                Descargar PDF
              </button>
              {savingFeedback && (
                <span className="text-xs text-slate-400">Guardando feedback inicial...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {isCaseSummaryOpen && selectedCase && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/95 shadow-[0_0_50px_rgba(8,145,178,0.28)]">
            <div className="flex items-center justify-between border-b border-slate-500/20 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Vista general</p>
                <p className="mt-1 font-mono text-lg text-slate-100">{selectedCase.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCaseSummaryOpen(false);
                  setSelectedDocument(null);
                }}
                className="rounded-lg border border-slate-500/30 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/40"
              >
                Cerrar
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-73px)] grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[340px_1fr]">
              <div className="border-b border-slate-500/20 bg-slate-950/60 p-5 lg:border-b-0 lg:border-r">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumen</p>
                <p className="mt-2 text-sm text-slate-200">{selectedCase.descripcion || 'Sin descripcion.'}</p>

                <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Metadatos del caso</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-200">
                    <div>
                      <p className="flex items-center gap-2">
                      <FiAlertTriangle size={12} className="text-amber-300" />
                      Tipo de delito:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 pl-5">
                        {(selectedCaseMetadata?.offenseTypes || []).length > 0 ? (
                          (selectedCaseMetadata?.offenseTypes || []).map((offense) => (
                            <span
                              key={`${selectedCase?.id}-offense-${offense}`}
                              className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100"
                            >
                              {offense}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300">Sin registrar</span>
                        )}
                      </div>
                    </div>
                    <p className="flex items-center gap-2">
                      <FiCalendar size={12} className="text-cyan-300" />
                      Fecha del caso: {selectedCaseMetadata?.caseDateLabel || 'Sin fecha'}
                    </p>
                    <div>
                      <p className="flex items-center gap-2">
                        <FiUsers size={12} className="text-emerald-300" />
                        Victimas:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 pl-5">
                        {(selectedCaseMetadata?.victims || []).length > 0 ? (
                          (selectedCaseMetadata?.victims || []).map((victim) => (
                            <span
                              key={`${selectedCase?.id}-victim-${victim}`}
                              className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100"
                            >
                              {victim}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300">Sin registrar</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="flex items-center gap-2">
                        <FiUsers size={12} className="text-rose-300" />
                        Victimarios:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 pl-5">
                        {(selectedCaseMetadata?.offenders || []).length > 0 ? (
                          (selectedCaseMetadata?.offenders || []).map((offender) => (
                            <span
                              key={`${selectedCase?.id}-offender-${offender}`}
                              className="rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100"
                            >
                              {offender}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300">Sin registrar</span>
                        )}
                      </div>
                    </div>
                    <p className="flex items-center gap-2">
                      <FiMapPin size={12} className="text-fuchsia-300" />
                      Zona territorial: {selectedCaseMetadata?.zone || 'Sin registrar'}
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-slate-300/80">
                      <FiShield size={12} className="text-cyan-200" />
                      Actores involucrados
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selectedCaseMetadata?.actors || []).map((actor, actorIndex) => (
                        <span
                          key={`${selectedCase?.id}-${actor}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-500/30 px-2 py-1 text-[11px] text-slate-100"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ACTOR_BADGE_COLORS[actorIndex % ACTOR_BADGE_COLORS.length] }}
                          />
                          {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-500/20 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Documentos</p>
                  {loadingDocuments ? (
                    <p className="mt-3 text-xs text-slate-400">Cargando documentos...</p>
                  ) : selectedCaseDocuments.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">No hay documentos en esta carpeta.</p>
                  ) : (
                    <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                      {selectedCaseDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDocument(doc)}
                          className={`w-full rounded-lg border px-3 py-3 text-left text-xs transition ${
                            selectedDocument?.id === doc.id
                              ? 'border-cyan-400/60 bg-cyan-500/10'
                              : 'border-slate-500/20 bg-slate-950/50 hover:border-cyan-400/30'
                          }`}
                        >
                          <p className="flex items-center gap-2 text-slate-100">
                            <FiFileText size={12} />
                            {doc.nombre}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">Haz clic para ver la preview</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-[56vh] flex-col bg-slate-950/80 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Preview</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {selectedDocument ? selectedDocument.nombre : 'Selecciona un documento para ampliarlo.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/60">
                  {selectedDocument ? (
                    getPdfViewerSrc(selectedDocument.archivo_url) ? (
                      <iframe
                        title={`preview-${selectedDocument.id}`}
                        src={getPdfViewerSrc(selectedDocument.archivo_url)}
                        className="h-full min-h-[62vh] w-full border-0 bg-white"
                      />
                    ) : (
                      <div className="flex h-full min-h-[62vh] items-center justify-center px-6 text-center">
                        <p className="text-sm text-slate-400">Solo se admite preview PDF.</p>
                      </div>
                    )
                  ) : (
                    <div className="flex h-full min-h-[62vh] items-center justify-center px-6 text-center">
                      <p className="text-sm text-slate-400">Elige un documento para ver una vista ampliada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
}

export default DashboardInvestigator;