import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FiArrowLeft,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiTrash2,
  FiCheck,
  FiLayers
} from 'react-icons/fi';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || '/api');

const EMPTY_FORM = {
  nombre: '',
  email: '',
  password: '',
  rol: 'investigador',
  equipo_id: '',
};

function InvestigatorsManagementPage({ token, onBack }) {
  const [investigators, setInvestigators] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEquiposModalOpen, setIsEquiposModalOpen] = useState(false);
  const [passwordModalId, setPasswordModalId] = useState(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  // Formulario nuevo equipo
  const [nuevoEquipoNombre, setNuevoEquipoNombre] = useState('');
  const [nuevoEquipoCodigo, setNuevoEquipoCodigo] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadInvestigators = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/admin/investigadores`, {
        headers: authHeaders,
      });
      setInvestigators(response.data || []);
    } catch (requestError) {
      console.error('Error cargando usuarios:', requestError);
      setError('No fue posible cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipos = async () => {
    try {
      const response = await axios.get(`${API_URL}/equipos`, {
        headers: authHeaders,
      });
      setEquipos(response.data || []);
    } catch (err) {
      console.warn('Error cargando equipos:', err);
    }
  };

  useEffect(() => {
    loadInvestigators();
    loadEquipos();
  }, [authHeaders]);

  const closeCreate = () => {
    setIsCreateOpen(false);
    setForm(EMPTY_FORM);
  };

  const openPasswordModal = (investigator) => {
    setPasswordModalId(investigator.id);
    setPasswordValue('');
  };

  const closePasswordModal = () => {
    setPasswordModalId(null);
    setPasswordValue('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API_URL}/admin/investigadores`,
        {
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          rol: form.rol,
          equipo_id: form.equipo_id || null,
        },
        { headers: authHeaders }
      );

      setSuccess(`Usuario (${form.rol}) creado correctamente.`);
      closeCreate();
      await loadInvestigators();
      await loadEquipos();
    } catch (requestError) {
      console.error('Error creando usuario:', requestError);
      setError(requestError.response?.data?.error || 'No fue posible crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearEquipo = async (e) => {
    e.preventDefault();
    if (!nuevoEquipoNombre.trim() || !nuevoEquipoCodigo.trim()) {
      setError('Nombre y código del equipo son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/equipos`,
        {
          nombre: nuevoEquipoNombre.trim(),
          codigo: nuevoEquipoCodigo.trim().toUpperCase(),
          duracion_segundos: 7200,
        },
        { headers: authHeaders }
      );
      setSuccess('Equipo creado correctamente.');
      setNuevoEquipoNombre('');
      setNuevoEquipoCodigo('');
      await loadEquipos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creando equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarEquipo = async (equipoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este equipo?')) return;
    try {
      await axios.delete(`${API_URL}/equipos/${equipoId}`, { headers: authHeaders });
      setSuccess('Equipo eliminado.');
      await loadEquipos();
      await loadInvestigators();
    } catch (err) {
      setError(err.response?.data?.error || 'Error eliminando equipo');
    }
  };

  const handleAsignarEquipo = async (usuarioId, equipoId) => {
    try {
      await axios.patch(
        `${API_URL}/admin/investigadores/${usuarioId}/equipo`,
        { equipo_id: equipoId || null },
        { headers: authHeaders }
      );
      setSuccess('Equipo asignado correctamente.');
      await loadInvestigators();
      await loadEquipos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error asignando equipo');
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    if (!passwordModalId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.patch(
        `${API_URL}/admin/investigadores/${passwordModalId}/password`,
        { password: passwordValue },
        { headers: authHeaders }
      );

      setSuccess('Contraseña actualizada correctamente.');
      closePasswordModal();
      await loadInvestigators();
    } catch (requestError) {
      console.error('Error actualizando contraseña:', requestError);
      setError(requestError.response?.data?.error || 'No fue posible actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (investigator) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const nextResolved = !investigator.feedback_resuelto;
      await axios.patch(
        `${API_URL}/admin/investigadores/${investigator.id}/resuelto`,
        { resuelto: nextResolved },
        { headers: authHeaders }
      );

      setSuccess(`Estado actualizado a ${nextResolved ? 'Resuelto' : 'Desbloqueado'}.`);
      await loadInvestigators();
    } catch (requestError) {
      console.error('Error actualizando estado resuelto:', requestError);
      setError(requestError.response?.data?.error || 'No fue posible actualizar el estado.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFirstLogin = async (investigator) => {
    if (!window.confirm(`¿Seguro que deseas reiniciar el primer ingreso de "${investigator.nombre}"? Volverá a ver la inducción.`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.patch(
        `${API_URL}/admin/investigadores/${investigator.id}/reset-first-login`,
        {},
        { headers: authHeaders }
      );

      setSuccess(`Inducción reiniciada para ${investigator.nombre}.`);
      await loadInvestigators();
    } catch (requestError) {
      console.error('Error reiniciando inducción:', requestError);
      setError(requestError.response?.data?.error || 'No fue posible reiniciar la inducción.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateInvestigator = async (investigator) => {
    if (!window.confirm(`¿Reactivar investigación de "${investigator.nombre}"? Se reiniciará todo su progreso para una nueva sesión.`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.patch(
        `${API_URL}/admin/investigadores/${investigator.id}/reactivar`,
        {},
        { headers: authHeaders }
      );

      setSuccess(`Investigación reactivada para ${investigator.nombre}.`);
      await loadInvestigators();
    } catch (requestError) {
      console.error('Error reactivando investigación:', requestError);
      setError(requestError.response?.data?.error || 'No fue posible reactivar la investigación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-investigation-bg text-slate-100">
      <header className="border-b border-cyan-500/20 bg-panel-dark px-8 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-100">GESTION DE USUARIOS Y EQUIPOS</h1>
            <p className="font-mono text-xs text-cyan-300/70">Administrar fiscales, asistentes, equipos mixtos y contraseñas</p>
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

      <main className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-mono text-xl font-semibold tracking-[0.15em] text-slate-100">Usuarios del Sistema</h2>
            <p className="mt-1 text-sm text-slate-400">Administra cuentas de Fiscales y Asistentes, y asígnalos a sus equipos de trabajo.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEquiposModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-900/50"
            >
              <FiLayers size={15} />
              Gestionar Equipos ({equipos.length})
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <FiUserPlus size={15} />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="font-mono text-cyan-300">Cargando usuarios...</div>
        ) : investigators.length === 0 ? (
          <div className="rounded-lg border border-slate-500/20 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {investigators.map((investigator) => {
              const isAdmin = investigator.rol === 'admin';
              const isAsistente = investigator.rol === 'asistente';
              const isFiscal = investigator.rol === 'investigador';

              return (
                <div 
                  key={investigator.id} 
                  className={`rounded-xl p-4 transition-all duration-300 ${
                    isAdmin 
                      ? 'border border-purple-500/30 bg-purple-950/20' 
                      : isAsistente
                      ? 'border border-amber-500/30 bg-[#120f08]'
                      : 'border border-cyan-500/20 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-lg text-slate-100">{investigator.nombre}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{investigator.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          isAdmin
                            ? 'border-purple-500/40 bg-purple-500/10 text-purple-200'
                            : isAsistente
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                        }`}
                      >
                        {isAdmin ? 'ADMIN' : isAsistente ? 'ASISTENTE' : 'FISCAL'}
                      </span>
                    </div>
                  </div>

                  {/* Detalle de Equipo */}
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
                    <span className="text-slate-400 font-mono">Equipo:</span>
                    <select
                      value={investigator.equipo_id || ''}
                      onChange={(e) => handleAsignarEquipo(investigator.id, e.target.value)}
                      disabled={isAdmin}
                      className="bg-transparent text-cyan-300 font-mono outline-none border-b border-cyan-500/30 text-xs py-0.5 cursor-pointer max-w-[170px]"
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Sin equipo</option>
                      {equipos.map((eq) => (
                        <option key={eq.id} value={eq.id} className="bg-slate-900 text-slate-200">
                          {eq.nombre} ({eq.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isAdmin && isFiscal && (
                    <div className="mt-3 space-y-1 rounded-lg border border-slate-500/20 bg-slate-900/40 p-2.5 text-xs text-slate-300">
                      <p className="flex items-center gap-2">
                        <FiShield size={12} className="text-cyan-400" />
                        Prueba: {investigator.feedback_id ? `Puntaje ${investigator.feedback_puntaje}%` : 'Aún no presentada'}
                      </p>
                      <p className="flex items-center gap-2">
                        <FiRefreshCw size={12} className="text-slate-400" />
                        Esperadas: {investigator.feedback_expected_total || 0} | Trazadas: {investigator.feedback_user_total || 0}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openPasswordModal(investigator)}
                        className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                      >
                        <FiLock size={13} />
                        Contraseña
                      </button>
                      {isFiscal && (
                        <button
                          type="button"
                          onClick={() => toggleResolved(investigator)}
                          disabled={!investigator.feedback_id || saving}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {investigator.feedback_id
                            ? investigator.feedback_resuelto
                              ? 'Reabrir prueba'
                              : 'Marcar resuelto'
                            : 'Sin feedback'}
                        </button>
                      )}
                    </div>
                    {isFiscal && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetFirstLogin(investigator)}
                          disabled={saving}
                          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                            investigator.primera_vez
                              ? 'border-slate-500/30 bg-slate-900/40 text-slate-400 cursor-not-allowed'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          }`}
                        >
                          <FiRefreshCw size={12} className={saving ? 'animate-spin' : ''} />
                          Inducción
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReactivateInvestigator(investigator)}
                          disabled={saving || !investigator.feedback_id}
                          className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                        >
                          Reactivar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL CREAR USUARIO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-mono text-lg font-semibold tracking-[0.2em] text-emerald-200">NUEVO USUARIO</h3>
              <button
                type="button"
                onClick={closeCreate}
                className="rounded border border-slate-500/30 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700/40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Nombre completo:</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                  placeholder="Ej: Dr. Carlos Pérez"
                  className="w-full rounded-lg border border-slate-500/20 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Correo electrónico:</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="carlos.perez@fiscalia.gov.co"
                  className="w-full rounded-lg border border-slate-500/20 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Contraseña temporal:</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="investigador123 / asistente123"
                  className="w-full rounded-lg border border-slate-500/20 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Rol en el despacho:</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm((current) => ({ ...current, rol: e.target.value }))}
                    className="w-full rounded-lg border border-slate-500/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="investigador">Fiscal (Investigador)</option>
                    <option value="asistente">Asistente de Fiscal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Equipo inicial:</label>
                  <select
                    value={form.equipo_id}
                    onChange={(e) => setForm((current) => ({ ...current, equipo_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-500/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="">Sin equipo inicial</option>
                    {equipos.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nombre} ({eq.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="rounded-lg border border-slate-500/30 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  <FiPlus size={14} />
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIONAR EQUIPOS */}
      {isEquiposModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-slate-900 p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col max-h-[88vh]">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-mono text-lg font-bold text-cyan-300 flex items-center gap-2">
                <FiLayers size={18} /> GESTIÓN DE EQUIPOS MIXTOS (1 FISCAL + 1 ASISTENTE)
              </h3>
              <button
                type="button"
                onClick={() => setIsEquiposModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Formulario nuevo equipo */}
            <form onSubmit={handleCrearEquipo} className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">Crear Nuevo Equipo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  required
                  value={nuevoEquipoNombre}
                  onChange={(e) => setNuevoEquipoNombre(e.target.value)}
                  placeholder="Nombre: Ej. Equipo Alfa"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono"
                />
                <input
                  type="text"
                  required
                  value={nuevoEquipoCodigo}
                  onChange={(e) => setNuevoEquipoCodigo(e.target.value)}
                  placeholder="Código: Ej. EQ-ALFA"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono uppercase"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/70 px-4 py-1.5 text-xs font-mono font-bold text-cyan-300 transition"
                >
                  + Agregar Equipo
                </button>
              </div>
            </form>

            {/* Lista de Equipos */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {equipos.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-500 font-mono">No hay equipos creados todavía.</div>
              ) : (
                equipos.map((eq) => {
                  const integrantes = eq.integrantes || [];
                  const fiscal = integrantes.find((i) => i.rol === 'investigador');
                  const asistente = integrantes.find((i) => i.rol === 'asistente');

                  return (
                    <div key={eq.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-100">{eq.nombre}</span>
                          <span className="rounded bg-cyan-950 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                            {eq.codigo}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarEquipo(eq.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Eliminar equipo"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
                        <div className="rounded border border-slate-800 bg-[#070b13] p-2">
                          <span className="text-[10px] text-cyan-400 block font-bold">FISCAL DELEGADO:</span>
                          <span className="text-slate-200">{fiscal ? fiscal.nombre : 'No asignado'}</span>
                        </div>
                        <div className="rounded border border-slate-800 bg-[#070b13] p-2">
                          <span className="text-[10px] text-amber-400 block font-bold">ASISTENTE FISCAL:</span>
                          <span className="text-slate-200">{asistente ? asistente.nombre : 'No asignado'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTUALIZAR PASSWORD */}
      {passwordModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6">
            <h3 className="font-mono text-sm font-bold text-cyan-300 mb-4">CAMBIAR CONTRASEÑA</h3>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <input
                type="password"
                required
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-cyan-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-500"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestigatorsManagementPage;
