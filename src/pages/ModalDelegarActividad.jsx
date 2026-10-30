import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  FiSend,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiFolder,
  FiX,
  FiUserCheck,
  FiLayers,
  FiPlusCircle,
  FiSearch,
  FiChevronDown,
  FiCheck
} from 'react-icons/fi';

const API_URL = import.meta.env.DEV ? `http://${window.location.hostname}:5000/api` : (import.meta.env.VITE_API_URL || '/api');

export default function ModalDelegarActividad({
  isOpen,
  onClose,
  usuario,
  carpetas = [],
  preselectedCase = null,
  authHeaders
}) {
  const [activeTab, setActiveTab] = useState('crear'); // 'crear' | 'historial'
  
  // Form fields
  const [titulo, setTitulo] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [urgencia, setUrgencia] = useState('ALTA');
  const [instrucciones, setInstrucciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Selector interactivo de expedientes (Combobox con filtro)
  const [isCasePickerOpen, setIsCasePickerOpen] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const pickerRef = useRef(null);

  // Historial de alertas delegadas
  const [alertas, setAlertas] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);

  const equipoId = usuario?.equipo_id || 'general';

  // Cerrar selector al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsCasePickerOpen(false);
      }
    };
    if (isCasePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCasePickerOpen]);

  // Precargar caso si viene preselected
  useEffect(() => {
    if (preselectedCase) {
      setSelectedCaseId(preselectedCase.id || '');
      setTitulo(`Diligencia e investigación sobre expediente ${preselectedCase.nombre?.replace('Caso ', '') || ''}`);
    } else {
      setSelectedCaseId('');
      setTitulo('');
    }
  }, [preselectedCase, isOpen]);

  // Caso actualmente seleccionado
  const selectedCase = useMemo(() => {
    return carpetas.find((c) => c.id === selectedCaseId) || null;
  }, [carpetas, selectedCaseId]);

  // Casos filtrados en vivo
  const filteredCases = useMemo(() => {
    if (!caseSearchQuery.trim()) return carpetas;
    const q = caseSearchQuery.toLowerCase();
    return carpetas.filter((c) => {
      const nombre = (c.nombre || '').toLowerCase();
      const delito = (c.tipo_delito || '').toLowerCase();
      return nombre.includes(q) || delito.includes(q);
    });
  }, [carpetas, caseSearchQuery]);

  // Cargar historial de alertas cuando se abre o se cambia a historial
  const cargarHistorialAlertas = async () => {
    if (!usuario?.equipo_id) return;
    setCargandoAlertas(true);
    try {
      const res = await axios.get(`${API_URL}/equipos/${encodeURIComponent(equipoId)}/alertas`, { headers: authHeaders });
      setAlertas(res.data || []);
    } catch (err) {
      console.warn('Error cargando alertas delegadas:', err);
    } finally {
      setCargandoAlertas(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarHistorialAlertas();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleCrearActividad = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      alert('Por favor ingrese el título o diligencia a delegar.');
      return;
    }
    if (!instrucciones.trim()) {
      alert('Por favor detalle las instrucciones u orientaciones para el asistente.');
      return;
    }

    setEnviando(true);
    try {
      const casoEncontrado = carpetas.find((c) => c.id === selectedCaseId);
      const radicadoText = casoEncontrado ? casoEncontrado.nombre?.replace('Caso ', '') : 'Diligencia General';
      const delitoText = casoEncontrado?.tipo_delito || 'Gestión Procesal de Despacho';

      await axios.post(
        `${API_URL}/equipos/${encodeURIComponent(equipoId)}/alertas`,
        {
          titulo: titulo.trim(),
          subtitulo: `Instrucción del Fiscal Titular (${urgencia})`,
          dialogo: instrucciones.trim(),
          delito: delitoText,
          radicado: radicadoText,
          casoNombre: casoEncontrado?.imagen_url || casoEncontrado?.nombre || null,
          delegadoPor: usuario?.nombre || 'Fiscal Delegado',
          opciones: [
            '1. Elaborar y proyectar documentos judiciales (órdenes, oficios, requerimientos)',
            '2. Apoyar la elaboración y seguimiento del programa metodológico',
            '3. Clasificar diligencias y actualizar sistemas de información misional',
            '4. Verificar aplicación del sistema de cadena de custodia y evidencias',
            '5. Coordinar actos de policía judicial con peritos / investigadores',
            '6. Atender a usuarios y brindar información legal autorizada',
            '7. Tramitar correspondencia, archivo documental o acciones constitucionales',
            '8. Consolidar matrices técnicas e informes del despacho',
            '9. Trasladar al Fiscal Delegado por ser decisión privativa de su competencia',
            '10. Ignorar o descartar esta solicitud / actividad (sin trámite)',
            '11. Otra decisión o trámite operativo conforme a las funciones del despacho'
          ]
        },
        { headers: authHeaders }
      );

      setSuccessToast('¡Actividad delegada exitosamente al Asistente de Fiscal!');
      setTitulo('');
      setInstrucciones('');
      setSelectedCaseId('');
      cargarHistorialAlertas();
      setTimeout(() => {
        setSuccessToast('');
        setActiveTab('historial');
      }, 1500);
    } catch (err) {
      console.error('Error delegando actividad:', err);
      alert('No fue posible asignar la actividad. Verifique la conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const pendientesCount = alertas.filter((a) => a.estado === 'PENDIENTE').length;
  const resueltasCount = alertas.filter((a) => a.estado !== 'PENDIENTE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-3xl border border-amber-500/40 bg-[#0a1220] p-6 md:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-amber-500/20 pb-4 mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <FiUserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                  Mando y Delegación Funcional
                </span>
                <span className="rounded-md bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  Despacho Fiscal
                </span>
              </div>
              <h2 className="font-mono text-xl font-black text-slate-100 mt-1">
                Asignación de Actividades al Asistente de Fiscal
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-mono p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('crear')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'crear'
                ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FiPlusCircle size={15} />
            <span>Crear Nueva Tarea Delegada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'historial'
                ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FiLayers size={15} />
            <span>Buzón de Tareas Delegadas</span>
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              {pendientesCount} pendientes / {resueltasCount} resueltas
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {successToast && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-sm text-emerald-300 font-mono font-bold flex items-center gap-2 animate-fadeIn">
              <FiCheckCircle size={18} />
              <span>{successToast}</span>
            </div>
          )}

          {activeTab === 'crear' ? (
            <form onSubmit={handleCrearActividad} className="space-y-4">
              {/* Título de la actividad */}
              <div>
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1.5">
                  1. Título o Tipo de Actividad a Encomendar:
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Oficiar a bancos receptores para extractos bancarios de transferencias sospechosas..."
                  className="w-full rounded-xl border border-slate-700 bg-[#050a14] p-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              {/* Selector Estético de Expediente & Nivel de Urgencia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative" ref={pickerRef}>
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 block mb-1.5 flex items-center justify-between">
                    <span>2. Expediente o Caso Vinculado:</span>
                    {selectedCase && (
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId('')}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-normal lowercase tracking-normal transition"
                      >
                        cambiar a trámite general
                      </button>
                    )}
                  </label>

                  {/* Disparador de Selección Actual */}
                  <div
                    onClick={() => setIsCasePickerOpen(!isCasePickerOpen)}
                    className="w-full rounded-xl border border-slate-700 hover:border-cyan-400 bg-[#050a14] p-3 text-sm font-mono cursor-pointer transition flex items-center justify-between shadow-inner select-none"
                  >
                    {selectedCase ? (
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                        <span className="font-bold text-slate-100 truncate">
                          {selectedCase.nombre?.replace('Caso ', 'Radicado: ')}
                        </span>
                        {selectedCase.tipo_delito && (
                          <span className="rounded-md bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 text-[10px] text-cyan-300 shrink-0 uppercase font-bold">
                            {selectedCase.tipo_delito}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <FiFolder className="text-cyan-400 shrink-0" size={17} />
                        <span className="font-medium text-slate-300">Trámite General / Diligencia del Despacho</span>
                        <span className="text-[10px] bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700">Sin caso individual</span>
                      </div>
                    )}
                    <FiChevronDown className={`text-slate-400 transition-transform duration-200 shrink-0 ${isCasePickerOpen ? 'rotate-180 text-cyan-400' : ''}`} size={17} />
                  </div>

                  {/* Dropdown flotante con buscador interactivo */}
                  {isCasePickerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-cyan-500/50 bg-[#070e1b] shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden animate-fadeIn">
                      {/* Search Bar Input */}
                      <div className="p-3 border-b border-slate-800 bg-[#03060d] flex items-center gap-2.5">
                        <FiSearch className="text-cyan-400 shrink-0" size={16} />
                        <input
                          type="text"
                          value={caseSearchQuery}
                          onChange={(e) => setCaseSearchQuery(e.target.value)}
                          placeholder="Escribe radicado o tipo de delito (ej: estafa, 11001, hurto)..."
                          className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
                          autoFocus
                        />
                        {caseSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCaseSearchQuery('')}
                            className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Lista de Casos con Scroll estilizado */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 p-1.5 font-mono text-xs">
                        {/* Opción General Fija */}
                        <div
                          onClick={() => {
                            setSelectedCaseId('');
                            setIsCasePickerOpen(false);
                            setCaseSearchQuery('');
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
                            !selectedCaseId
                              ? 'bg-cyan-950/80 text-cyan-200 font-bold border border-cyan-500/40 shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <FiFolder className="text-cyan-400 shrink-0" size={16} />
                            <div>
                              <span className="block font-semibold">Trámite General / Diligencia del Despacho</span>
                              <span className="text-[10px] text-slate-500 block">Diligencia administrativa, auditoría o informe global</span>
                            </div>
                          </div>
                          {!selectedCaseId && <FiCheck className="text-cyan-400" size={16} />}
                        </div>

                        {/* Opciones filtradas */}
                        {filteredCases.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 text-xs">
                            No se encontraron expedientes coincidentes con "{caseSearchQuery}"
                          </div>
                        ) : (
                          filteredCases.map((c) => {
                            const isSelected = selectedCaseId === c.id;
                            const radicadoOnly = c.nombre?.replace('Caso ', '');
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setSelectedCaseId(c.id);
                                  setIsCasePickerOpen(false);
                                  setCaseSearchQuery('');
                                  if (!titulo || titulo.startsWith('Diligencia')) {
                                    setTitulo(`Diligencia e investigación sobre expediente ${radicadoOnly}`);
                                  }
                                }}
                                className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-cyan-950/80 text-cyan-200 font-bold border border-cyan-500/40 shadow-sm'
                                    : 'text-slate-300 hover:bg-[#0c1626] hover:text-white'
                                }`}
                              >
                                <div className="truncate flex-1">
                                  <span className="font-semibold block truncate text-slate-100">
                                    Radicado: <strong className="text-amber-300 font-bold">{radicadoOnly}</strong>
                                  </span>
                                  {c.tipo_delito && (
                                    <span className="text-[10px] text-cyan-400/90 uppercase font-medium mt-0.5 block">
                                      Delito: {c.tipo_delito}
                                    </span>
                                  )}
                                </div>
                                {isSelected ? (
                                  <FiCheck className="text-cyan-400 shrink-0" size={16} />
                                ) : (
                                  <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5 shrink-0 hover:border-cyan-400 hover:text-cyan-300">
                                    Seleccionar
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer con conteo informativo */}
                      <div className="px-3 py-1.5 bg-[#03060c] border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>{filteredCases.length} expedientes encontrados</span>
                        <span className="text-slate-600">Haz clic para vincular</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1.5">
                    3. Prioridad / Urgencia:
                  </label>
                  <select
                    value={urgencia}
                    onChange={(e) => setUrgencia(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#050a14] p-3 text-sm text-amber-300 font-bold outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="ALTA">🔴 ALTA (Inmediata)</option>
                    <option value="MEDIA">🟡 MEDIA (Prioritaria)</option>
                    <option value="NORMAL">🟢 NORMAL (Trámite Ordinario)</option>
                  </select>
                </div>
              </div>

              {/* Instrucciones y Orientaciones del Fiscal */}
              <div>
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1.5">
                  4. Instrucciones Procesales y Orientaciones para el Asistente:
                </label>
                <textarea
                  rows={4}
                  value={instrucciones}
                  onChange={(e) => setInstrucciones(e.target.value)}
                  placeholder="Indique detalladamente al asistente qué folios revisar, qué pruebas o actos de investigación coordinar, o qué proyectos de oficios judiciales debe proyectar para su posterior refrendación..."
                  className="w-full rounded-xl border border-slate-700 bg-[#03060d] p-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-400 font-mono resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-2.5 font-mono text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-600 to-yellow-600 px-7 py-2.5 font-mono text-xs font-bold text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] transition disabled:opacity-50 flex items-center gap-2"
                >
                  <FiSend size={15} />
                  <span>{enviando ? 'Asignando...' : 'Asignar y Notificar al Asistente'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab: Buzón de Historial de Tareas Delegadas */
            <div className="space-y-3">
              {cargandoAlertas ? (
                <div className="text-center py-12 text-slate-400 font-mono text-sm">
                  Cargando actividades del despacho...
                </div>
              ) : alertas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-sm border border-dashed border-slate-800 rounded-2xl">
                  No hay actividades delegadas al asistente en este momento.
                </div>
              ) : (
                alertas.map((alt) => {
                  const isResuelto = alt.estado !== 'PENDIENTE';
                  return (
                    <div
                      key={alt.id}
                      className={`rounded-2xl border p-4 font-mono transition-all ${
                        isResuelto
                          ? 'border-emerald-500/30 bg-emerald-950/20 shadow-md'
                          : 'border-amber-500/30 bg-[#070d18] shadow-md'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isResuelto
                                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-amber-950 border border-amber-500/40 text-amber-300 animate-pulse'
                              }`}
                            >
                              {isResuelto ? '✓ RESUELTO POR EL ASISTENTE' : '⏳ PENDIENTE DE GESTIÓN'}
                            </span>
                            {alt.delito && (
                              <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-cyan-300">
                                {alt.delito}
                              </span>
                            )}
                            {alt.radicado && (
                              <span className="text-[11px] text-amber-400 font-bold">
                                Rad: {alt.radicado}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-100">{alt.titulo}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-[#03060c] p-2.5 rounded-xl border border-slate-800/80">
                            <strong className="text-slate-400 uppercase text-[10px] block mb-0.5">
                              Instrucción impartida:
                            </strong>
                            {alt.dialogo || alt.subtitulo}
                          </p>
                        </div>
                      </div>

                      {/* Si ya fue resuelta por el Asistente, mostrar la decisión y justificación */}
                      {isResuelto && (
                        <div className="mt-3 pt-3 border-t border-emerald-500/20 bg-emerald-950/40 p-3 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold">
                            <FiCheckCircle size={14} />
                            <span>Actuación adoptada por el Asistente ({alt.resuelto_por || 'Asistente'}):</span>
                          </div>
                          <p className="text-xs text-white font-semibold pl-4">
                            {alt.opcion_seleccionada || 'Actuación registrada'}
                          </p>
                          {alt.justificacion && (
                            <div className="mt-1 pl-4 text-[11px] text-emerald-200/90 italic">
                              <strong>Fundamento técnico:</strong> "{alt.justificacion}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
