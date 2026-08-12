import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  FiArrowLeft,
  FiTrash2,
  FiPlusCircle,
  FiUpload,
  FiAlertCircle,
  FiUser,
  FiEye,
  FiX
} from 'react-icons/fi';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || '/api');

function DespachoEventsPage({ token, onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Preview states
  const [previewEvent, setPreviewEvent] = useState(null);
  const [previewStep, setPreviewStep] = useState(1); // 1 = options, 2 = image view
  const [previewReplyText, setPreviewReplyText] = useState('');
  const [previewCountdown, setPreviewCountdown] = useState(60);

  useEffect(() => {
    if (previewEvent) {
      setPreviewCountdown(60);
    }
  }, [previewEvent]);

  useEffect(() => {
    if (!previewEvent) return;

    const interval = setInterval(() => {
      setPreviewCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPreviewEvent(null);
          alert("VISTA PREVIA - Tiempo Límite Agotado");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [previewEvent]);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/eventos-despacho`, { headers: authHeaders });
      setEvents(response.data || []);
    } catch (e) {
      console.error('Error cargando eventos:', e);
      setError('No fue posible cargar las imágenes de alertas y personas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [authHeaders]);

  const handleFilesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSaving(true);
    setError('');
    setSuccess('');

    let uploadedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      // Get base name without extension
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')).toLowerCase().trim();
      
      // Validation: must start with 'alerta' or 'persona'
      if (!baseName.startsWith('alerta') && !baseName.startsWith('persona')) {
        failedCount += 1;
        continue;
      }

      try {
        const base64Url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        await axios.post(
          `${API_URL}/eventos-despacho`,
          {
            nombre: baseName,
            imagen_url: base64Url
          },
          { headers: authHeaders }
        );
        uploadedCount += 1;
      } catch (e) {
        console.error('Error cargando archivo:', file.name, e);
        failedCount += 1;
      }
    }

    if (uploadedCount > 0) {
      setSuccess(`Se cargaron ${uploadedCount} archivos correctamente.`);
    }
    if (failedCount > 0) {
      setError(`Omitidos/Fallidos ${failedCount} archivos. Recuerde que el nombre debe iniciar con 'alerta' o 'persona'.`);
    }

    loadEvents();
    setSaving(false);
    // Reset file input value
    event.target.value = '';
  };

  const handleDelete = async (id, nombre) => {
    const confirmDelete = window.confirm(`¿Está seguro de que desea eliminar el evento "${nombre}"?`);
    if (!confirmDelete) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API_URL}/eventos-despacho/${id}`, { headers: authHeaders });
      setSuccess(`Evento "${nombre}" eliminado correctamente.`);
      loadEvents();
    } catch (e) {
      console.error('Error eliminando evento:', e);
      setError('No fue posible eliminar el evento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-investigation-bg text-slate-100">
      <header className="border-b border-cyan-500/20 bg-panel-dark px-8 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-100">ALERTAS & ENTREVISTAS (IMÁGENES)</h1>
            <p className="font-mono text-xs text-cyan-300/70">Suba imágenes de Alertas (ARKIVA) y Personas (Entrevistas) para eventos del despacho</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg border border-slate-500/30 px-4 py-2 font-mono text-sm text-slate-300 transition hover:bg-slate-700/40"
          >
            <FiArrowLeft size={16} />
            Volver
          </button>
        </div>
      </header>

      <main className="p-8 space-y-6">
        {/* Upload Container */}
        <div className="rounded-xl border border-slate-800 bg-[#070b13]/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-mono text-lg font-bold text-slate-100">Subir Imágenes de Eventos</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono leading-relaxed">
              Suba archivos individuales o múltiples. Los nombres de archivo deben empezar por <strong className="text-cyan-300">alerta</strong> o <strong className="text-purple-300">persona</strong> (ej. <code>alerta1.png</code>, <code>persona_entrevista.jpg</code>).
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-6 py-3 cursor-pointer text-sm font-bold text-white transition font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0 self-start md:self-center">
            <FiUpload size={16} />
            <span>{saving ? 'Procesando...' : 'Seleccionar Archivos'}</span>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={saving}
              onChange={handleFilesUpload}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-mono">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 font-mono">
            {success}
          </div>
        )}

        {/* Gallery */}
        <div className="space-y-4">
          <h2 className="font-mono text-xl font-semibold tracking-[0.15em] text-slate-100 border-b border-slate-800 pb-2">
            Pool de Eventos Activos ({events.length})
          </h2>

          {loading ? (
            <div className="font-mono text-cyan-300 py-8">Cargando pool de imágenes...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-[#02050b]/40 py-16 text-center text-slate-500 font-mono">
              <FiAlertCircle size={40} className="mx-auto mb-3 text-slate-600" />
              <span>No hay imágenes cargadas para eventos.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {events.map((evt) => {
                const isAlerta = evt.nombre.startsWith('alerta');
                return (
                  <div key={evt.id} className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden flex flex-col justify-between group hover:border-cyan-500/40 transition">
                    <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-900">
                      <img
                        src={evt.imagen_url}
                        alt={evt.nombre}
                        className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        isAlerta ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/30' : 'bg-purple-950/90 text-purple-300 border border-purple-500/30'
                      }`}>
                        {isAlerta ? 'Alerta (ARKIVA)' : 'Persona'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-300 truncate" title={evt.nombre}>
                        {evt.nombre}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewEvent(evt);
                            setPreviewStep(1);
                            setPreviewReplyText('');
                          }}
                          title="Previsualizar"
                          className="text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-cyan-500/10 transition"
                        >
                          <FiEye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(evt.id, evt.nombre)}
                          disabled={saving}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Interactive Simulation Preview Modal */}
      {previewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          {/* Pulsating Background */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-[pulse_2s_infinite] shadow-[inset_0_0_100px_rgba(239,68,68,0.35)]" />
          
          {/* Stable Modal Content */}
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-red-600 bg-gradient-to-b from-[#180505] to-[#070b13] p-6 shadow-[0_0_60px_rgba(239,68,68,0.7)] flex flex-col max-h-[90vh]">
            
            {previewEvent.nombre.startsWith('alerta') ? (
              // ALERTA CORREO PREVIEW FLOW
              <div className="space-y-6">
                <div className="border-b border-red-500/30 pb-4 text-center relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 text-2xl mb-2">
                    ✉
                  </div>
                  <h2 className="font-mono text-xl font-black text-red-500 uppercase tracking-widest animate-bounce">
                    Nuevo correo institucional
                  </h2>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-mono mt-1">
                    Sistema ARKIVA • Despacho fiscal (VISTA PREVIA)
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="mt-3 inline-flex flex-col items-center bg-red-900/20 border border-red-500/40 rounded-xl px-8 py-2.5 select-none shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-red-400 font-mono font-extrabold animate-pulse">TIEMPO LÍMITE DE DECISIÓN</span>
                    <span className="text-3xl font-black text-red-500 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]">{previewCountdown}s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewEvent(null)}
                    className="absolute top-0 right-0 rounded-lg p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                {previewStep === 1 ? (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-slate-300 font-mono">
                      Ha recibido una alerta urgente en su buzón de ARKIVA. Decida cómo proceder:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setPreviewStep(2)}
                        className="rounded-lg border border-cyan-500 bg-cyan-950/60 p-4 text-sm font-bold text-cyan-300 hover:bg-cyan-900/60 transition font-mono flex flex-col items-center justify-center gap-1"
                      >
                        <span>Leer correo</span>
                        <span className="text-[10px] text-red-400 font-semibold">(Resta 2 minutos en el juego)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(null)}
                        className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-sm font-bold text-slate-300 hover:bg-slate-700/60 transition font-mono flex flex-col items-center justify-center gap-1"
                      >
                        <span>Dejar pasar</span>
                        <span className="text-[10px] text-slate-500">(No afecta el tiempo)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-800 bg-[#02050b] p-2 aspect-video overflow-hidden">
                      <img
                        src={previewEvent.imagen_url}
                        alt="Alerta"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                        Escriba su respuesta al correo:
                      </label>
                      <textarea
                        rows={3}
                        value={previewReplyText}
                        onChange={(e) => setPreviewReplyText(e.target.value)}
                        placeholder="Escriba su justificación o respuesta aquí..."
                        className="w-full rounded-lg border border-slate-800 bg-[#030712] p-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-red-500 resize-none font-mono"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(null)}
                        className="rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 px-6 py-2.5 text-xs font-bold text-red-200 transition font-mono"
                      >
                        Enviar y Cerrar Vista Previa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // PERSONA ENTREVISTA PREVIEW FLOW
              <div className="space-y-6">
                <div className="border-b border-red-500/30 pb-4 text-center relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 text-2xl mb-2">
                    👥
                  </div>
                  <h2 className="font-mono text-xl font-black text-red-500 uppercase tracking-widest">
                    USUARIO EN EL DESPACHO
                  </h2>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-mono mt-1">
                    Atención de Testigos y Entrevistas (VISTA PREVIA)
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="mt-3 inline-flex flex-col items-center bg-red-900/20 border border-red-500/40 rounded-xl px-8 py-2.5 select-none shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-red-400 font-mono font-extrabold animate-pulse">TIEMPO LÍMITE DE DECISIÓN</span>
                    <span className="text-3xl font-black text-red-500 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]">{previewCountdown}s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewEvent(null)}
                    className="absolute top-0 right-0 rounded-lg p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                {previewStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 font-mono text-center leading-relaxed">
                      Ha llegado un usuario a su despacho para una entrevista. Debe decidir cómo atender la situación:
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setPreviewStep(2)}
                        className="w-full rounded-lg border border-cyan-500 bg-cyan-950/60 p-4 text-sm font-bold text-cyan-300 hover:bg-cyan-900/60 transition font-mono flex items-center justify-between"
                      >
                        <span>Aceptar usuario en despacho</span>
                        <span className="text-[11px] text-red-400 font-semibold">(Resta 5 minutos)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewStep(1.5)}
                        className="w-full rounded-lg border border-purple-500 bg-purple-950/60 p-4 text-sm font-bold text-purple-300 hover:bg-purple-900/60 transition font-mono flex items-center justify-between"
                      >
                        <span>Remitir al judicante</span>
                        <span className="text-[11px] text-red-400 font-semibold">(Resta 3 minutos)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewEvent(null)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-sm font-bold text-slate-300 hover:bg-slate-700/60 transition font-mono flex items-center justify-between"
                      >
                        <span>Reprogramar la entrevista</span>
                        <span className="text-[11px] text-slate-500">(No afecta el tiempo)</span>
                      </button>
                    </div>
                  </div>
                ) : previewStep === 1.5 ? (
                  <div className="space-y-6 text-center py-6">
                    <p className="text-sm font-bold text-amber-300 font-mono border border-amber-500/20 bg-amber-500/10 p-4 rounded-xl">
                      "El judicante menciona que es urgente que reciba la entrevista."
                    </p>
                    <p className="text-xs text-red-400 font-mono">
                      (Se restarán 5 minutos adicionales para realizar la entrevista urgente)
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewStep(2)}
                      className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 px-8 py-3 text-sm font-bold text-amber-200 transition font-mono"
                    >
                      Continuar a la entrevista
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-800 bg-[#02050b] p-2 aspect-video overflow-hidden">
                      <img
                        src={previewEvent.imagen_url}
                        alt="Entrevista"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(null)}
                        className="rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 px-6 py-2.5 text-xs font-bold text-red-200 transition font-mono"
                      >
                        Finalizar Vista Previa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DespachoEventsPage;
