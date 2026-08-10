import React from 'react';
import {
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiFileText,
  FiFolder,
  FiMapPin,
  FiUsers,
  FiX,
} from 'react-icons/fi';

const ACTOR_BADGE_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f97316'];

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

function CasesSidebarModule({
  usuario,
  logout,
  elapsedSeconds,
  formatSeconds,
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
}) {
  return (
    <div className="min-h-screen bg-investigation-bg text-slate-100">
      <header className="border-b border-cyan-500/20 bg-panel-dark px-6 py-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Módulo de casos</p>
            <h1 className="mt-1 font-mono text-xl font-semibold tracking-[0.18em] text-slate-100">Carpetas del caso</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSwitchToBoard}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Tablero de casos
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

      <main className="p-4 md:p-6">
        <div className="mb-4 rounded-lg border border-slate-500/20 bg-slate-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-cyan-200">
            <FiClock size={15} />
            Tiempo investigando: <span className="font-mono">{formatSeconds(elapsedSeconds)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Desde aquí administras y revisas las carpetas del caso, sus documentos y su información general.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-xl border border-slate-600/30 bg-slate-950/70 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Carpetas</p>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {loadingCases ? (
                <p className="text-sm text-slate-400">Cargando carpetas...</p>
              ) : (
                carpetas.map((caseItem) => {
                  const metadata = caseMetadataById.get(caseItem.id);
                  return (
                    <div
                      key={caseItem.id}
                      className={`w-full rounded-md border px-3 py-2 transition ${
                        selectedCaseId === caseItem.id
                          ? 'border-cyan-400/60 bg-cyan-500/10'
                          : 'border-slate-500/20 bg-slate-950/50 hover:border-cyan-400/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCase(caseItem.id)}
                        className="w-full text-left"
                      >
                        <p className="flex items-center gap-2 font-mono text-sm text-slate-100">
                          <FiFolder size={14} />
                          {caseItem.nombre}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{caseItem.cantidad_documentos || 0} documentos</p>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                          <p className="flex items-center gap-1 truncate">
                            <FiAlertTriangle size={10} className="text-amber-300" />
                            {metadata?.offenseType || 'Sin delito'}
                          </p>
                          <p className="flex items-center gap-1 truncate">
                            <FiCalendar size={10} className="text-cyan-300" />
                            {metadata?.caseDateLabel || 'Sin fecha'}
                          </p>
                          <p className="col-span-2 flex items-center gap-1 truncate">
                            <FiMapPin size={10} className="text-emerald-300" />
                            {metadata?.zone || 'Sin zona'}
                          </p>
                        </div>
                      </button>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400">Seleccionada para documentos</p>
                        <button
                          type="button"
                          onClick={() => onOpenCaseDetails(caseItem.id)}
                          className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="space-y-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vista general del caso</p>
              {selectedCase ? (
                <div className="mt-2 rounded-xl border border-slate-500/20 bg-slate-900/60 p-4">
                  <p className="font-mono text-lg text-slate-100">{selectedCase.nombre}</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedCase.descripcion || 'Sin descripcion.'}</p>
                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-200">
                    <p className="flex items-center gap-2">
                      <FiAlertTriangle size={12} className="text-amber-300" />
                      Tipo de delito:
                    </p>
                    <div className="flex flex-wrap gap-2 pl-5">
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
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-slate-500/20 bg-slate-900/60 p-4 text-sm text-slate-400">
                  Selecciona una carpeta para ver su detalle.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-500/20 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Documentos</p>
              {selectedCase ? (
                loadingDocuments ? (
                  <p className="mt-3 text-xs text-slate-400">Cargando documentos...</p>
                ) : selectedCaseDocuments.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">No hay documentos en esta carpeta.</p>
                ) : (
                  <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                    {selectedCaseDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => onSelectDocument(doc)}
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
                )
              ) : (
                <p className="mt-3 text-xs text-slate-400">Selecciona una carpeta para ver sus documentos.</p>
              )}
            </div>

            <div className="min-h-[40vh] rounded-xl border border-cyan-500/20 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Preview</p>
              {selectedDocument ? (
                getPdfViewerSrc(selectedDocument.archivo_url) ? (
                  <iframe
                    title={`preview-${selectedDocument.id}`}
                    src={getPdfViewerSrc(selectedDocument.archivo_url)}
                    className="mt-3 h-[48vh] w-full rounded-lg border border-slate-500/20 bg-white"
                  />
                ) : (
                  <div className="mt-3 flex h-[48vh] items-center justify-center rounded-lg border border-slate-500/20 bg-slate-950/60 px-6 text-center">
                    <p className="text-sm text-slate-400">Solo se admite preview PDF.</p>
                  </div>
                )
              ) : (
                <div className="mt-3 flex h-[48vh] items-center justify-center rounded-lg border border-slate-500/20 bg-slate-950/60 px-6 text-center">
                  <p className="text-sm text-slate-400">Elige un documento para ver una vista ampliada.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default CasesSidebarModule;
