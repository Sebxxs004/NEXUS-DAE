import React, { useState, useMemo, useEffect } from 'react';
import {
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiFileText,
  FiFolder,
  FiMapPin,
  FiUsers,
  FiX,
  FiSearch,
  FiFilter,
  FiEye,
  FiPlus,
  FiMinus,
  FiRefreshCw
} from 'react-icons/fi';
import useAuthStore from '../store/useAuthStore';

function CasesSidebarModule({
  usuario,
  logout,
  elapsedSeconds,
  formatSeconds,
  configData,
  loadingCases,
  carpetas,
  selectedCaseId,
  onSelectCase,
  caseMetadataById,
  selectedCase,
  selectedCaseMetadata,
  loadingDocuments,
  selectedCaseDocuments,
  selectedDocument,
  onSelectDocument,
  onClose,
  onOpenCaseDetails,
  onSwitchToBoard,
  onSwitchToLobby,
  investigationFinished,
  tutorialStep,
  setTutorialStep,
  onStartDecisionForGroup,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelito, setSelectedDelito] = useState('Todos');
  const [detailCase, setDetailCase] = useState(null);

  const guardarGrupos = useAuthStore((state) => state.guardarGrupos);

  // Grouping States
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [createdGroups, setCreatedGroups] = useState(() => {
    try {
      return usuario?.created_groups ? JSON.parse(usuario.created_groups) : [];
    } catch (e) {
      return [];
    }
  });

  // Auto select cases during tutorial step 4/5
  useEffect(() => {
    if (tutorialStep === 4 || tutorialStep === 5) {
      if (carpetas.length >= 2) {
        setSelectedCaseIds([carpetas[0].id, carpetas[1].id]);
      }
    } else if (tutorialStep === 3) {
      setSelectedCaseIds([]);
    }
  }, [tutorialStep, carpetas]);

  // Mock group for tutorial visual demonstration
  const displayGroups = useMemo(() => {
    if (tutorialStep === 7 || tutorialStep === 8 || tutorialStep === 9 || tutorialStep === 9.1 || tutorialStep === 9.2 || tutorialStep === 9.3) {
      if (carpetas.length >= 2) {
        const mockGroup = {
          id: 'mock-tutorial-group',
          name: 'Grupo Criminal 1 (VISTA PREVIA)',
          caseIds: [carpetas[0].id, carpetas[1].id],
          color: 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          asociarPor: 'Modalidad',
          justificacion: 'Casos asociados por coincidencia de alias y modus operandi en zona sur.'
        };
        return [mockGroup, ...createdGroups];
      }
    }
    return createdGroups;
  }, [createdGroups, tutorialStep, carpetas]);

  const [expandedGroupIds, setExpandedGroupIds] = useState([]);

  // Auto expand tutorial mock group
  useEffect(() => {
    if (tutorialStep === 8 || tutorialStep === 9 || tutorialStep === 9.1 || tutorialStep === 9.2 || tutorialStep === 9.3) {
      setExpandedGroupIds(prev => {
        if (prev.includes('mock-tutorial-group')) return prev;
        return [...prev, 'mock-tutorial-group'];
      });
    }
  }, [tutorialStep]);

  // Inline rename states
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Justification Modal States
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [justifyMode, setJustifyMode] = useState('create'); // 'create' | 'add'
  const [asociarPor, setAsociarPor] = useState('Modalidad');
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

  // Sync groups if user prop changes
  useEffect(() => {
    if (usuario?.created_groups) {
      try {
        setCreatedGroups(JSON.parse(usuario.created_groups));
      } catch (e) {
        console.error(e);
      }
    }
  }, [usuario]);

  // Block scroll on page body when detail modal is open
  useEffect(() => {
    if (detailCase || isJustifyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [detailCase, isJustifyModalOpen]);

  // Group Handlers
  const handleCreateGroup = () => {
    if (selectedCaseIds.length < 2) return;
    const newGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: `Grupo ${createdGroups.length + 1}`,
      color: GROUP_COLORS[createdGroups.length % GROUP_COLORS.length],
      caseIds: [...selectedCaseIds],
      asociarPor,
      justificacion: justificacionText
    };
    const updatedGroups = [...createdGroups, newGroup];
    setCreatedGroups(updatedGroups);
    setExpandedGroupIds((prev) => [...prev, newGroupId]);
    guardarGrupos(updatedGroups);
    setSelectedCaseIds([]);
  };

  const handleAddToGroup = (groupId) => {
    if (selectedCaseIds.length === 0) return;
    const updatedGroups = createdGroups.map((g) => {
      if (g.id === groupId) {
        const newIds = [...g.caseIds];
        selectedCaseIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return {
          ...g,
          caseIds: newIds,
          asociarPor,
          justificacion: g.justificacion 
            ? `${g.justificacion}\n[Anexo]: ${justificacionText}` 
            : justificacionText
        };
      } else {
        return { ...g, caseIds: g.caseIds.filter(id => !selectedCaseIds.includes(id)) };
      }
    }).filter(g => g.caseIds.length > 0);
    setCreatedGroups(updatedGroups);
    setExpandedGroupIds((prev) => {
      if (prev.includes(groupId)) return prev;
      return [...prev, groupId];
    });
    guardarGrupos(updatedGroups);
  };

  const handleSaveGroupName = (groupId) => {
    if (!editGroupName.trim()) return;
    const updated = createdGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, name: editGroupName.trim() };
      }
      return g;
    });
    setCreatedGroups(updated);
    guardarGrupos(updated);
    setEditingGroupId(null);
  };

  const handleOpenCreateModal = () => {
    if (selectedCaseIds.length < 2) return;
    setJustifyMode('create');
    setAsociarPor('Modalidad');
    setJustificacionText('');
    setIsJustifyModalOpen(true);
  };

  const handleOpenAddModal = () => {
    if (selectedCaseIds.length < 1 || createdGroups.length === 0) return;
    setJustifyMode('add');
    setSelectedTargetGroupId(createdGroups[0]?.id || '');
    setAsociarPor('Modalidad');
    setJustificacionText('');
    setIsJustifyModalOpen(true);
  };

  const handleConfirmJustification = () => {
    if (justifyMode === 'create') {
      handleCreateGroup();
    } else if (justifyMode === 'add') {
      handleAddToGroup(selectedTargetGroupId);
    }
    setIsJustifyModalOpen(false);
  };

  const handleResetGroups = () => {
    setCreatedGroups([]);
    setExpandedGroupIds([]);
    setSelectedCaseIds([]);
    guardarGrupos([]);
  };

  const handleRemoveFromGroup = (groupId, caseId) => {
    const c = carpetas.find(item => item.id === caseId);
    const caseName = c ? c.nombre.replace("Caso ", "") : "";
    const confirmDelete = window.confirm(`¿Está seguro de que desea eliminar el Radicado ${caseName} de este grupo?`);
    if (!confirmDelete) return;

    const updatedGroups = createdGroups.map((g) => {
      if (g.id === groupId) {
        return { ...g, caseIds: g.caseIds.filter(id => id !== caseId) };
      }
      return g;
    }).filter(g => g.caseIds.length > 0);
    
    setCreatedGroups(updatedGroups);
    guardarGrupos(updatedGroups);
  };

  const toggleGroupExpand = (groupId) => {
    if (expandedGroupIds.includes(groupId)) {
      setExpandedGroupIds(expandedGroupIds.filter(id => id !== groupId));
    } else {
      setExpandedGroupIds([...expandedGroupIds, groupId]);
    }
  };

  // Zoom & Pan States
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Get all unique delitos for filter dropdown
  const uniqueDelitos = useMemo(() => {
    const list = new Set();
    carpetas.forEach((c) => {
      const meta = caseMetadataById.get(c.id);
      const delito = meta?.offenseType || c.tipo_delito;
      if (delito) {
        list.add(delito);
      }
    });
    return ['Todos', ...Array.from(list)];
  }, [carpetas, caseMetadataById]);

  // Filter cases
  const filteredCarpetas = useMemo(() => {
    return carpetas.filter((c) => {
      const meta = caseMetadataById.get(c.id);
      const delito = meta?.offenseType || c.tipo_delito || 'No especificado';
      
      const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDelito = selectedDelito === 'Todos' || delito.toLowerCase() === selectedDelito.toLowerCase();
      
      return matchesSearch && matchesDelito;
    });
  }, [carpetas, caseMetadataById, searchTerm, selectedDelito]);

  // Handle zooming
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => {
    setZoomScale(prev => {
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
      setZoomScale(prev => Math.min(prev + zoomIntensity, 4));
    } else {
      setZoomScale(prev => {
        const next = Math.max(prev - zoomIntensity, 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag-and-pan handler
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
    onSelectCase(caseItem.id);
    handleResetZoom();
  };

  const handleCloseDetailModal = () => {
    setDetailCase(null);
    handleResetZoom();
  };

  return (
    <div className="min-h-screen bg-investigation-bg text-slate-100 flex flex-col">
      <header className="border-b border-cyan-500/20 bg-panel-dark px-6 py-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Módulo de casos</p>
            <h1 className="mt-1 font-mono text-xl font-semibold tracking-[0.18em] text-slate-100">Procesos del despacho</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSwitchToLobby}
              className="rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-900/50 hover:text-white"
            >
              ← Volver
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 flex-1 flex flex-col space-y-6 max-w-full mx-auto w-full">
        {/* Timer Bar */}
        <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-600/30 bg-slate-950/60 px-6 py-3.5 backdrop-blur-sm shadow-xl gap-4">
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            Modo de Inspección General de Expedientes
          </p>
          {/* Alarming Timer Badge */}
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-red-800 via-red-600 to-rose-700 px-6 py-2.5 font-mono text-sm md:text-base font-black tracking-widest text-white shadow-[0_0_30px_rgba(220,38,38,0.8)] border-2 border-red-400/80 animate-pulse scale-105">
            <FiAlertTriangle className="text-white animate-bounce shrink-0" size={18} />
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              TIEMPO LÍMITE: {formatSeconds(Math.max(0, (configData?.tiempo_limite_minutos || 180) * 60 - elapsedSeconds))}
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/20 shadow-md">
          <div className="relative md:col-span-2">
            <FiSearch className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar caso por número de radicado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-500/30 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <select
              value={selectedDelito}
              onChange={(e) => setSelectedDelito(e.target.value)}
              className="w-full rounded-lg border border-slate-500/30 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 appearance-none capitalize transition-all"
            >
              {uniqueDelitos.map((delito) => (
                <option key={delito} value={delito} className="bg-slate-950 text-slate-200 capitalize">
                  {delito === 'Todos' ? 'Todos los delitos' : delito}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Group Actions Bar */}
        {selectedCaseIds.length > 0 && (
          <div className={`flex flex-wrap items-center gap-3 bg-slate-950/80 border border-cyan-500/20 p-4 rounded-xl shadow-xl backdrop-blur-md animate-welcome-zoom ${
            tutorialStep === 5 ? 'relative z-[10000] border-cyan-400 ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''
          }`}>
            <span className="font-mono text-xs text-slate-300">
              ⚡ {selectedCaseIds.length} seleccionados:
            </span>
            {selectedCaseIds.length >= 2 && !investigationFinished && (
              <button
                onClick={handleOpenCreateModal}
                className="rounded-lg bg-cyan-600 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-950/30"
              >
                Crear grupo
              </button>
            )}
            {selectedCaseIds.length >= 1 && createdGroups.length > 0 && !investigationFinished && (
              <button
                onClick={handleOpenAddModal}
                className="rounded-lg bg-cyan-600 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-950/30"
              >
                Agregar a un grupo existente
              </button>
            )}
            <button
              onClick={() => setSelectedCaseIds([])}
              className="text-xs text-slate-400 hover:text-white underline transition"
            >
              Cancelar selección
            </button>
            {displayGroups.length > 0 && !investigationFinished && (
              <button
                onClick={handleResetGroups}
                className="ml-auto rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-300 transition hover:bg-red-500/20 hover:text-white"
              >
                Deshacer Grupos
              </button>
            )}
          </div>
        )}

        {/* Main Grid: Cards + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Left Column: Cards Grid */}
          <div className={`xl:col-span-1 ${
            (tutorialStep === 3 || tutorialStep === 4) ? 'relative z-[10000] border-2 border-cyan-400 rounded-xl p-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-[1.01] transition-all bg-[#090d16]' : ''
          }`}>
            {loadingCases ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                <p className="font-mono text-sm text-slate-400">Cargando expedientes del despacho...</p>
              </div>
            ) : filteredCarpetas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-500/20 bg-slate-950/40 p-12 text-center">
                <FiFolder className="mx-auto text-slate-500 mb-3" size={40} />
                <p className="font-mono text-sm text-slate-400">No se encontraron expedientes con los criterios seleccionados.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCarpetas.map((caseItem) => {
                  const metadata = caseMetadataById.get(caseItem.id);
                  const delito = metadata?.offenseType || caseItem.tipo_delito || 'No especificado';
                  
                  // Group styling logic
                  const cardGroup = displayGroups.find((g) => g.caseIds.includes(caseItem.id));
                  const cardColorStyle = cardGroup 
                    ? cardGroup.color 
                    : 'border-slate-700/30 bg-slate-950/70 hover:border-cyan-400/40 hover:shadow-cyan-950/10';

                  const isCardHighlighted = (tutorialStep === 7 && cardGroup?.id === 'mock-tutorial-group');

                  return (
                    <div
                      key={caseItem.id}
                      className={`group rounded-xl border overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between ${cardColorStyle} ${
                        isCardHighlighted ? 'relative z-[10005] ring-4 ring-cyan-400 scale-[1.03] shadow-[0_0_30px_rgba(6,182,212,0.7)] animate-pulse' : ''
                      }`}
                    >
                      {/* Case Thumbnail */}
                      <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
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
                        
                        {/* Top Left Checkbox */}
                        <div className={`absolute top-3 left-3 z-10 bg-slate-950/80 p-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm transition-all ${
                          tutorialStep === 4 ? 'z-[10005] border-cyan-400 ring-2 ring-cyan-400/80 scale-110 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : ''
                        }`}>
                          <input
                            type="checkbox"
                            disabled={Boolean(cardGroup) || investigationFinished}
                            checked={selectedCaseIds.includes(caseItem.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCaseIds([...selectedCaseIds, caseItem.id]);
                              } else {
                                setSelectedCaseIds(selectedCaseIds.filter((id) => id !== caseItem.id));
                              }
                            }}
                            className={`h-4.5 w-4.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
                              tutorialStep === 4 ? 'ring-4 ring-cyan-400 scale-125 shadow-[0_0_20px_rgba(6,182,212,0.85)] animate-pulse' : ''
                            }`}
                          />
                        </div>

                        {/* Group Badge if member */}
                        {cardGroup && (
                          <span className="absolute top-3 right-3 rounded-md bg-cyan-950 border border-cyan-400 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300 backdrop-blur-sm shadow-md">
                            {cardGroup.name}
                          </span>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="font-mono text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            Radicado: {caseItem.nombre.replace("Caso ", "")}
                          </h3>
                          <p className="mt-1.5 text-xs text-cyan-300/80 font-mono capitalize flex items-center gap-1.5">
                            <FiAlertTriangle size={13} className="text-amber-400" />
                            Delito: {delito}
                          </p>
                        </div>

                        <button
                          onClick={() => handleOpenDetailModal(caseItem)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 py-2 font-mono text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 hover:text-white"
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

          {/* Right Column: Folder Tree Sidebar */}
          <aside className={`xl:col-span-1 bg-slate-950/60 p-5 rounded-xl border border-cyan-500/20 backdrop-blur-sm shadow-xl flex flex-col space-y-4 h-fit max-h-[75vh] overflow-y-auto ${
            (tutorialStep === 8 || tutorialStep === 9) ? 'relative z-[10000] border-cyan-400 ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.02]' : ''
          }`}>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300 border-b border-slate-800 pb-2.5 flex items-center justify-between">
              <span>Arquitectura de Grupos</span>
              {displayGroups.length > 0 && (
                <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/30">
                  {displayGroups.length}
                </span>
              )}
            </h3>

            {displayGroups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No hay grupos creados. Seleccione casos para agruparlos.
              </div>
            ) : (
              <div className="space-y-2">
                {displayGroups.map((group) => {
                  const isExpanded = expandedGroupIds.includes(group.id);
                  const isEditing = editingGroupId === group.id;
                  
                  return (
                    <div key={group.id} className="font-mono text-xs">
                      {/* Group Folder Row or Inline Edit Input */}
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
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
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
                          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 text-slate-200 cursor-pointer transition-colors group/folder"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FiFolder className={isExpanded ? 'text-yellow-400 fill-yellow-400/10' : 'text-yellow-500'} size={14} />
                            <span className="font-bold truncate">{group.name}</span>
                            
                            {/* Pencil Edit Icon */}
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (investigationFinished) return;
                                  setEditingGroupId(group.id);
                                  setEditGroupName(group.name);
                              }}
                              disabled={investigationFinished}
                              title="Editar nombre"
                              className={`p-0.5 hover:bg-slate-800 hover:text-cyan-400 rounded transition ml-1 shrink-0 ${tutorialStep === 9 ? 'opacity-100' : 'opacity-0 group-hover/folder:opacity-100'}`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                            {isExpanded ? '▼' : '▶'} ({group.caseIds.length})
                          </span>
                        </div>
                      )}

                      {/* Group Files/Cases List */}
                      {isExpanded && !isEditing && (
                        <div className="ml-4 pl-3 border-l border-slate-800 mt-1 space-y-1">
                          {group.caseIds.map((caseId) => {
                            const c = carpetas.find(item => item.id === caseId);
                            if (!c) return null;
                            return (
                              <div
                                key={caseId}
                                className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/50 text-slate-400 hover:text-slate-200 transition group/item"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <FiFileText size={12} className="text-cyan-400" />
                                  <span className="truncate">Radicado: {c.nombre.replace("Caso ", "")}</span>
                                </span>
                                {!investigationFinished && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromGroup(group.id, caseId);
                                    }}
                                    title="Eliminar del grupo"
                                    className={`p-1 hover:bg-red-500/10 hover:text-red-400 rounded transition ${tutorialStep === 9 ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
                                  >
                                    <FiX size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Decision Button per Group – always visible unless it is the mock tutorial group (render in tutorial step 10+) */}
                      {!isEditing && onStartDecisionForGroup && (group.id !== 'mock-tutorial-group' || tutorialStep >= 9.1) && (
                        (() => {
                          const hasDecisions = group.decisions && group.decisions.length > 0;
                          return (
                            <button
                              type="button"
                              disabled={hasDecisions}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasDecisions) {
                                  onStartDecisionForGroup(group);
                                }
                              }}
                              className={`mt-2 w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-wider transition-all border ${
                                tutorialStep === 9.1
                                  ? 'ring-4 ring-cyan-400 border-cyan-400 bg-cyan-950 animate-pulse relative z-[20005] shadow-[0_0_20px_rgba(6,182,212,0.6)] text-cyan-200'
                                  : hasDecisions
                                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400/60 cursor-not-allowed'
                                    : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400/60'
                              }`}
                            >
                              <span>{hasDecisions ? '✓ Decisiones tomadas' : '¿Qué decisiones vas a tomar ahora?'}</span>
                              <span className={`text-[10px] ${hasDecisions ? 'text-emerald-500/40' : 'text-cyan-400'}`}>{hasDecisions ? '✓' : '➔'}</span>
                            </button>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Advanced Details Modal with Zoom & Pan */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 md:p-6 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl border border-cyan-500/30 bg-slate-900/95 overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4 bg-slate-950/40">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300 font-mono">Expediente General</p>
                <h2 className="mt-0.5 font-mono text-lg font-bold text-slate-100">
                  Radicado: {detailCase.nombre.replace("Caso ", "")} 
                  <span className="text-slate-500 mx-2 font-normal">|</span> 
                  <span className="text-cyan-300 font-normal capitalize">Delito: {detailCase.tipo_delito || 'No especificado'}</span>
                </h2>
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="rounded-lg border border-slate-600/50 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-slate-950 flex flex-col relative min-h-[500px]">
              {/* Floating Controls */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-lg bg-slate-950/80 p-1.5 border border-slate-800 backdrop-blur-md">
                <button
                  onClick={handleZoomIn}
                  title="Acercar Zoom"
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 transition"
                >
                  <FiPlus size={16} />
                </button>
                <button
                  onClick={handleZoomOut}
                  title="Alejar Zoom"
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 transition"
                >
                  <FiMinus size={16} />
                </button>
                <button
                  onClick={handleResetZoom}
                  title="Restablecer (1:1)"
                  className="p-1.5 px-3 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 transition font-mono text-[11px] font-bold"
                >
                  1:1
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-400">{Math.round(zoomScale * 100)}%</span>
              </div>

              {/* Viewer Window */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onWheel={handleWheel}
                className="flex-1 overflow-hidden relative flex items-center justify-center select-none min-h-[60vh] p-4"
              >
                {detailCase.imagen_url ? (
                  <img
                    src={detailCase.imagen_url}
                    alt={detailCase.nombre}
                    draggable={false}
                    className="max-h-[65vh] max-w-full object-contain transition-transform duration-75 origin-center"
                    style={{
                      transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                      cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Este caso no tiene imagen asignada.</p>
                )}
              </div>

              <div className="bg-slate-950 px-4 py-2 border-t border-slate-900 text-center text-xs text-slate-400 font-mono">
                {zoomScale > 1 ? 'Haz clic y arrastra para explorar la imagen' : 'Usa los controles flotantes para hacer zoom o arrastrar'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal (Unificado para crear y agregar) */}
      {isJustifyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm animate-welcome-zoom">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyan-400 uppercase tracking-wider mb-1">
              Justificar Asociación Múltiple
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              Se creará una relación en cadena para los casos seleccionados.
            </p>

            <div className="space-y-4">
              {/* Target Group Dropdown (Only shown in 'add' mode) */}
              {justifyMode === 'add' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Grupo de destino:
                  </label>
                  <select
                    value={selectedTargetGroupId}
                    onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400 capitalize transition-all"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Asociar por:
                </label>
                <select
                  value={asociarPor}
                  onChange={(e) => setAsociarPor(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400 transition-all"
                >
                  <option value="Modalidad">Modalidad</option>
                  <option value="Modus operandi">Modus operandi</option>
                  <option value="Patrón">Patrón</option>
                  <option value="Criterio de Conexidad">Criterio de Conexidad</option>
                  <option value="Fenómeno criminal">Fenómeno criminal</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Justificación:
                </label>
                <textarea
                  value={justificacionText}
                  onChange={(e) => setJustificacionText(e.target.value)}
                  placeholder="Escribe los detalles de la asociación..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400 resize-none transition-all"
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
                className="rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-5 py-2.5 text-xs font-bold text-cyan-200 transition shadow-lg shadow-cyan-950/20 font-mono"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tutorial Overlays inside CasesSidebarModule */}
      {((tutorialStep >= 3 && tutorialStep <= 9) || tutorialStep === 9.1 || tutorialStep === 9.2 || tutorialStep === 9.3) && (
        <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center p-4">
          {/* Backdrop with no blur to keep screen clean */}
          <div className={`absolute inset-0 transition-all ${
            (tutorialStep === 3 || tutorialStep === 4 || tutorialStep === 5 || tutorialStep === 7 || tutorialStep === 8 || tutorialStep === 9 || tutorialStep === 9.1 || tutorialStep === 9.2 || tutorialStep === 9.3) ? 'bg-slate-950/15 backdrop-blur-none' : 'bg-slate-950/60 backdrop-blur-none'
          }`} />

          {/* Tutorial Step Cards */}
          {tutorialStep === 3 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-12">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-bounce">
                📂
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Matriz de Casos Cargados
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 3 de 10
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Esta es la **Matriz de Casos**. Aquí verás todas las noticias criminales asignadas a tu despacho. Cada tarjeta muestra el delito principal y te permite abrir el expediente para inspeccionar los documentos.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTutorialStep(4)}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 4 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-12">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ☑
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Selección de Casos
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 4 de 10
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Puedes seleccionar casos que consideres que deben ir agrupados marcando las casillas de verificación en la esquina superior izquierda de cada tarjeta. **(Hemos seleccionado los dos primeros radicados como demostración)**.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTutorialStep(5)}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 5 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-12">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ⚡
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Crear un Grupo Nuevo
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 5 de 10
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Al seleccionar dos o más casos, la **Barra de Acciones** aparece arriba. Al hacer clic en el botón de **'Crear grupo'**, procederás a justificar la asociación de estos expedientes.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTutorialStep(6)}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 6 && (
            <div className="relative w-full max-w-4xl rounded-2xl border-2 border-cyan-400 bg-[#070b13] p-6 shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-welcome-zoom z-[10001] grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Instructions Tooltip inside the modal */}
              <div className="flex flex-col justify-between bg-slate-900/60 border border-cyan-500/20 p-5 rounded-xl space-y-4">
                <div className="space-y-3">
                  <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-lg">
                    ✍️
                  </div>
                  <h3 className="font-mono text-sm font-bold text-cyan-300 uppercase tracking-wider">
                    ¿Cómo justificar la asociación?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    Para consolidar un grupo criminal, debes obligatoriamente indicar el criterio de conexidad en el campo **Asociar por** (ej: la misma modalidad, patrón común o territorio compartido).
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    Además, debes redactar una **Justificación** detallada que sustente por qué consideras que estos casos están conectados e investigados como un único grupo.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Paso 6 de 10
                </div>
              </div>

              {/* Right Column: Preview Form */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="border-b border-slate-700/50 pb-3">
                  <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Ventana de Justificación (Demostración)
                  </h3>
                </div>
                
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Asociar por:</label>
                    <select disabled className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-300 outline-none">
                      <option>Modalidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Justificación:</label>
                    <textarea disabled className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300 outline-none resize-none font-mono" rows={4} value="Se asocian ambos radicados debido a que en las denuncias se identifica el mismo alias del victimario y un modus operandi idéntico en zona sur." />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setTutorialStep(7)}
                    className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}

          {tutorialStep === 7 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-12">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                🎨
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Visualización del Grupo Formado
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 7 de 10
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  ¡El grupo se ha creado! Como puedes observar en las tarjetas destacadas detrás de este modal, los casos asociados ahora lucen un **borde y sombreado verde brillante** y muestran una etiqueta con el nombre del grupo.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTutorialStep(8)}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 8 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-[380px]">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                📁
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Arquitectura de Grupos (Sidebar)
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 8 de 10
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  En la **barra lateral derecha** (Arquitectura de Grupos) verás de forma colapsable y jerárquica la estructura de todas tus carpetas. Esto te permite tener un inventario ordenado de tus asociaciones.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTutorialStep(9)}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 9 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[10001] md:absolute md:top-32 md:right-[380px]">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ✏️
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Editar Nombre y Remover Casos
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 9 de 12
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Haciendo clic en el lápiz al lado del grupo en la barra lateral podrás **renombrarlo** libremente. Si deseas retirar un caso de un grupo, solo despliégalo y presiona el botón **(X)** para sacarlo del grupo.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTutorialStep(9.1);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 9.1 && (
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[20006] md:absolute md:top-32 md:right-[380px]">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ⚡
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Toma de Decisiones por Grupo
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 9.1 de 12
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Al final de la carpeta de cada grupo en la barra lateral (resaltado abajo), verás el botón **¿Qué decisiones vas a tomar ahora?**. Púlsalo para abrir el panel de decisiones sobre ese conjunto de casos.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Open the mock decision modal for demo
                    const demoGroup = displayGroups[0] || { id: 'demo', name: 'Grupo Criminal 1', caseIds: [] };
                    onStartDecisionForGroup(demoGroup);
                    setTutorialStep(9.2);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Ver panel de decisiones →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 9.2 && (
            <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[200000] md:absolute md:top-24 md:right-8 lg:md:right-16">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ☑️
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Opciones y Checkboxes
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 9.2 de 12
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  En la columna izquierda del modal, selecciona las **acciones o decisiones fiscales** (checkboxes) que consideres necesarias ordenar sobre este grupo. Puedes marcar una o más opciones.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTutorialStep(9.3);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {tutorialStep === 9.3 && (
            <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 text-center space-y-6 shadow-[0_0_45px_rgba(6,182,212,0.3)] animate-welcome-zoom z-[200000] md:absolute md:bottom-24 md:right-8 lg:md:right-16">
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 text-xl mx-auto animate-pulse">
                ✍️
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-base font-bold text-cyan-300 uppercase tracking-wider">
                  Justificación de Decisiones
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Paso 9.3 de 12
                </p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-mono">
                  Por cada opción que selecciones se desplegará una pregunta. En el campo de texto deberás **justificar legal o investigativamente** la decisión específica. Al terminar de guardar, volvamos a la pantalla inicial.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Force-close the decision modal in parent state if active
                    onSwitchToLobby();
                    setTutorialStep(10);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition font-mono shadow-md"
                >
                  Regresar a la pantalla inicial →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CasesSidebarModule;
