import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFile,
  FiFolder,
  FiLink2,
  FiMinus,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import useAuthStore from '../store/useAuthStore';
import InvestigatorsManagementPage from './InvestigatorsManagementPage';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || '/api');
const EMPTY_DOCUMENT = { nombre: '', descripcion: '', archivo_url: '' };
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 40 * 1024 * 1024;

function DashboardAdmin() {
  const { usuario, token, logout } = useAuthStore();

  const [carpetas, setCarpetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingCase, setSavingCase] = useState(false);
  const [deletingCaseId, setDeletingCaseId] = useState(null);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const [modalData, setModalData] = useState({
    nombre: '',
    descripcion: '',
    imagen_url: '',
    tipo_delito: '',
    fecha_caso: '',
    victima: '',
    victimario: '',
    zona_territorial: '',
    actores_involucrados: '',
    documentos: [{ ...EMPTY_DOCUMENT }],
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configData, setConfigData] = useState({ tiempo_limite_minutos: 10 });
  const [savingConfig, setSavingConfig] = useState(false);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [caseViewData, setCaseViewData] = useState(null);
  const [viewerDocumentos, setViewerDocumentos] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [connectionSourceCase, setConnectionSourceCase] = useState(null);
  const [existingConnections, setExistingConnections] = useState([]);
  const [connectionSaving, setConnectionSaving] = useState(false);
  const [connectionData, setConnectionData] = useState({
    carpeta_destino_id: '',
    tipo: 'modalidad',
    razonamiento: '',
  });
  const [connectionFeedback, setConnectionFeedback] = useState(null);
  const [activeSection, setActiveSection] = useState('casos');
  const [uploadProgress, setUploadProgress] = useState({
    uploading: false,
    total: 0,
    current: 0,
    currentName: '',
  });

  useEffect(() => {
    cargarCarpetas();
    cargarConfiguracion();
  }, []);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const cargarConfiguracion = async () => {
    try {
      const response = await axios.get(`${API_URL}/configuracion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setConfigData(response.data);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const response = await axios.put(`${API_URL}/configuracion`, configData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigData(response.data);
      setIsConfigModalOpen(false);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError('No fue posible guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const getPdfViewerSrc = (archivoUrl) => {
    if (!archivoUrl) return null;

    const normalized = String(archivoUrl).trim();
    if (normalized.startsWith('data:application/pdf')) {
      return normalized;
    }

    // Only allow HTTP/HTTPS URLs that explicitly point to a PDF file.
    const isHttp = /^https?:\/\//i.test(normalized);
    const isPdfUrl = /\.pdf($|\?|#)/i.test(normalized);
    if (isHttp && isPdfUrl) {
      return normalized;
    }

    return null;
  };

  const isPdfFile = (archivoUrl) => getPdfViewerSrc(archivoUrl) !== null;

  const cargarCarpetas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/carpetas`, {
        headers: authHeaders,
      });
      setCarpetas(response.data);
    } catch (requestError) {
      console.error('Error cargando carpetas:', requestError);
      setError('No fue posible cargar los casos.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (filesList) => {
    const files = Array.from(filesList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      setError('No se seleccionaron archivos de imagen válidos.');
      return;
    }

    setUploadProgress({
      uploading: true,
      total: files.length,
      current: 0,
      currentName: '',
    });

    const fileToBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

    let successCount = 0;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
      const underscoreIdx = nameWithoutExt.indexOf('_');
      let numeroRadicado = nameWithoutExt;
      let delito = 'No especificado';

      if (underscoreIdx !== -1) {
        numeroRadicado = nameWithoutExt.substring(0, underscoreIdx);
        delito = nameWithoutExt.substring(underscoreIdx + 1);
      }

      setUploadProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentName: file.name,
      }));

      try {
        const base64Image = await fileToBase64(file);
        await axios.post(
          `${API_URL}/carpetas`,
          {
            nombre: `Caso ${numeroRadicado}`,
            tipo_delito: delito,
            imagen_url: base64Image,
            usuario_id: usuario.id,
          },
          {
            headers: authHeaders,
          }
        );
        successCount += 1;
      } catch (err) {
        console.error(`Error subiendo archivo ${file.name}:`, err);
      }
    }

    setUploadProgress({
      uploading: false,
      total: 0,
      current: 0,
      currentName: '',
    });

    if (successCount > 0) {
      await cargarCarpetas();
    } else {
      setError('No se pudo subir ninguna imagen de caso.');
    }
  };

  const resetModal = () => {
    setModalData({
      nombre: '',
      descripcion: '',
      imagen_url: '',
      tipo_delito: '',
      fecha_caso: '',
      victima: '',
      victimario: '',
      zona_territorial: '',
      actores_involucrados: '',
      documentos: [{ ...EMPTY_DOCUMENT }],
    });
    setIsEditMode(false);
    setSelectedCaseId(null);
    setSavingCase(false);
  };

  const openCreateModal = () => {
    setError('');
    resetModal();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModal();
  };

  const openEditModal = async (carpeta) => {
    setError('');
    setSavingCase(true);
    try {
      const response = await axios.get(`${API_URL}/documentos/carpeta/${carpeta.id}`, {
        headers: authHeaders,
      });

      const documentos = response.data.length
        ? response.data.map((doc) => ({
            id: doc.id,
            nombre: doc.nombre || '',
            descripcion: doc.descripcion || '',
            archivo_url: doc.archivo_url || '',
          }))
        : [{ ...EMPTY_DOCUMENT }];

      setModalData({
        nombre: carpeta.nombre || '',
        descripcion: carpeta.descripcion || '',
        imagen_url: carpeta.imagen_url || '',
        tipo_delito: carpeta.tipo_delito || '',
        fecha_caso: carpeta.fecha_caso ? String(carpeta.fecha_caso).slice(0, 10) : '',
        victima: carpeta.victima || '',
        victimario: carpeta.victimario || '',
        zona_territorial: carpeta.zona_territorial || '',
        actores_involucrados: Array.isArray(carpeta.actores_involucrados)
          ? carpeta.actores_involucrados.join(', ')
          : (carpeta.actores_involucrados || ''),
        documentos,
      });
      setSelectedCaseId(carpeta.id);
      setIsEditMode(true);
      setIsModalOpen(true);
    } catch (requestError) {
      console.error('Error cargando caso para edición:', requestError);
      setError('No se pudo cargar el caso para edición.');
    } finally {
      setSavingCase(false);
    }
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen en el caso.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('La imagen excede el tamaño máximo permitido (15 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setModalData((current) => ({
        ...current,
        imagen_url: String(reader.result),
      }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDropImage = (event) => {
    event.preventDefault();
    handleImageFile(event.dataTransfer.files?.[0]);
  };

  const handlePasteImage = (event) => {
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleImageFile(item.getAsFile());
        break;
      }
    }
  };

  const handleDocumentFile = (index, file) => {
    if (!file) {
      return;
    }

    if (!file.type.includes('pdf')) {
      setError('Solo se permiten archivos PDF en documentos.');
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError('El documento excede el tamaño máximo permitido (40 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const encodedFile = String(reader.result);
      setModalData((current) => {
        const updated = [...current.documentos];
        const currentDoc = updated[index] || { ...EMPTY_DOCUMENT };
        updated[index] = {
          ...currentDoc,
          archivo_url: encodedFile,
          nombre: currentDoc.nombre?.trim() ? currentDoc.nombre : file.name,
        };
        return {
          ...current,
          documentos: updated,
        };
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDropDocument = (index, event) => {
    event.preventDefault();
    handleDocumentFile(index, event.dataTransfer.files?.[0]);
  };

  const updateDocumentField = (index, field, value) => {
    setModalData((current) => {
      const updated = [...current.documentos];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...current,
        documentos: updated,
      };
    });
  };

  const addDocumentField = () => {
    setModalData((current) => ({
      ...current,
      documentos: [...current.documentos, { ...EMPTY_DOCUMENT }],
    }));
  };

  const removeDocumentField = (index) => {
    setModalData((current) => {
      if (current.documentos.length === 1) {
        return {
          ...current,
          documentos: [{ ...EMPTY_DOCUMENT }],
        };
      }
      return {
        ...current,
        documentos: current.documentos.filter((_, i) => i !== index),
      };
    });
  };

  const syncDocumentos = async (carpetaId, documentos) => {
    if (isEditMode) {
      const existentes = await axios.get(`${API_URL}/documentos/carpeta/${carpetaId}`, {
        headers: authHeaders,
      });

      for (const doc of existentes.data) {
        await axios.delete(`${API_URL}/documentos/${doc.id}`, {
          headers: authHeaders,
        });
      }
    }

    const validDocuments = documentos
      .map((doc) => ({
        nombre: doc.nombre.trim(),
        descripcion: doc.descripcion.trim(),
        archivo_url: doc.archivo_url?.trim() || null,
      }))
      .filter((doc) => doc.nombre.length > 0);

    for (const doc of validDocuments) {
      await axios.post(
        `${API_URL}/documentos`,
        {
          carpeta_id: carpetaId,
          nombre: doc.nombre,
          descripcion: doc.descripcion || null,
          archivo_url: doc.archivo_url,
          usuario_id: usuario.id,
        },
        {
          headers: authHeaders,
        }
      );
    }
  };

  const handleSubmitCase = async (event) => {
    event.preventDefault();
    setSavingCase(true);
    setError('');

    try {
      let carpetaId = selectedCaseId;

      if (isEditMode) {
        await axios.put(
          `${API_URL}/carpetas/${selectedCaseId}`,
          {
            nombre: modalData.nombre,
            descripcion: modalData.descripcion,
            imagen_url: modalData.imagen_url,
            tipo_delito: modalData.tipo_delito,
            fecha_caso: modalData.fecha_caso || null,
            victima: modalData.victima,
            victimario: modalData.victimario,
            zona_territorial: modalData.zona_territorial,
            actores_involucrados: modalData.actores_involucrados,
          },
          {
            headers: authHeaders,
          }
        );
      } else {
        const response = await axios.post(
          `${API_URL}/carpetas`,
          {
            nombre: modalData.nombre,
            descripcion: modalData.descripcion,
            imagen_url: modalData.imagen_url,
            tipo_delito: modalData.tipo_delito,
            fecha_caso: modalData.fecha_caso || null,
            victima: modalData.victima,
            victimario: modalData.victimario,
            zona_territorial: modalData.zona_territorial,
            actores_involucrados: modalData.actores_involucrados,
            usuario_id: usuario.id,
          },
          {
            headers: authHeaders,
          }
        );
        carpetaId = response.data.id;
      }

      await syncDocumentos(carpetaId, modalData.documentos);
      closeModal();
      await cargarCarpetas();
    } catch (requestError) {
      console.error('Error guardando caso:', requestError);
      setError('No fue posible guardar el caso.');
    } finally {
      setSavingCase(false);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm('Esta acción eliminará el caso y sus documentos. ¿Deseas continuar?')) {
      return;
    }

    setDeletingCaseId(caseId);
    setError('');
    try {
      await axios.delete(`${API_URL}/carpetas/${caseId}`, {
        headers: authHeaders,
      });
      await cargarCarpetas();
    } catch (requestError) {
      console.error('Error eliminando caso:', requestError);
      setError('No fue posible eliminar el caso.');
    } finally {
      setDeletingCaseId(null);
    }
  };

  const openViewerModal = async (carpeta) => {
    setIsViewerOpen(true);
    setViewerLoading(true);
    setCaseViewData(carpeta);
    setSelectedDocument(null);
    try {
      const response = await axios.get(`${API_URL}/documentos/carpeta/${carpeta.id}`, {
        headers: authHeaders,
      });
      setViewerDocumentos(response.data);
    } catch (requestError) {
      console.error('Error cargando documentos para visor:', requestError);
      setError('No se pudieron cargar los documentos.');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewerModal = () => {
    setIsViewerOpen(false);
    setViewerDocumentos([]);
    setSelectedDocument(null);
    setCaseViewData(null);
  };

  const downloadDocument = (pdf) => {
    const link = document.createElement('a');
    link.href = pdf.archivo_url;
    link.download = pdf.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  if (activeSection === 'investigadores') {
    return (
      <InvestigatorsManagementPage
        token={token}
        onBack={() => setActiveSection('casos')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-investigation-bg text-slate-100">
      <header className="border-b border-cyan-500/20 bg-panel-dark px-8 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-100">NEXUS DAE</h1>
            <p className="font-mono text-xs text-cyan-300/70">Bienvenido {usuario?.nombre}</p>
          </div>
          <div className="flex items-center gap-2">

            <button
              onClick={() => setActiveSection('investigadores')}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-mono text-sm text-emerald-200 transition hover:bg-emerald-500/20"
            >
              Fiscales
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-sm text-red-300 transition hover:bg-red-500/20"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xl font-semibold tracking-[0.15em] text-slate-100">Gestión de Casos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-500/30 px-4 py-2 font-mono text-sm font-semibold text-slate-200 transition hover:bg-slate-700/40"
              >
                <FiSettings size={16} />
                Configuración
              </button>

            </div>
          </div>

        {/* Bulk Upload Section */}
        <div className="mb-8 rounded-xl border border-dashed border-cyan-500/30 bg-slate-950/40 p-8 text-center backdrop-blur-sm">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleBulkUpload(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            <div className="rounded-full bg-cyan-500/10 p-4 text-cyan-400">
              <FiFolder size={32} />
            </div>
            <div>
              <h3 className="font-mono text-lg font-semibold text-slate-100">Carga Masiva de Casos (Nodos)</h3>
              <p className="mt-1 text-sm text-slate-400">
                Arrastra tus imágenes aquí o haz clic en los botones de abajo.
              </p>
              <p className="mt-1 font-mono text-xs text-cyan-300/60">
                Formato requerido: <span className="underline">numeroRadicado_delito.extension</span> (Ej: 123456_homicidio.png)
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 font-mono text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 hover:text-white">
                <FiPlus size={16} />
                Seleccionar Imágenes
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) handleBulkUpload(e.target.files);
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-500/30 bg-slate-900/60 px-4 py-2 font-mono text-sm font-semibold text-slate-200 transition hover:bg-slate-700/40 hover:text-white">
                <FiFolder size={16} />
                Seleccionar Carpeta
                <input 
                  type="file" 
                  webkitdirectory="" 
                  directory="" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) handleBulkUpload(e.target.files);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="font-mono text-cyan-300">Cargando casos...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {carpetas.map((carpeta) => (
              <div
                key={carpeta.id}
                className="rounded-lg border border-cyan-500/20 bg-slate-950/50 p-6 backdrop-blur-sm transition hover:border-cyan-400/40"
              >
                {carpeta.imagen_url && (
                  <img src={carpeta.imagen_url} alt={carpeta.nombre} className="mb-4 h-40 w-full rounded-lg object-cover" />
                )}
                <h3 className="font-mono text-lg font-semibold text-slate-100">
                  Radicado: {carpeta.nombre.replace("Caso ", "")}
                </h3>
                <p className="mt-1 text-sm font-mono text-cyan-300/80 capitalize">
                  Delito: {carpeta.tipo_delito || 'No especificado'}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => openViewerModal(carpeta)}
                    className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-green-200 transition hover:bg-green-500/20 hover:text-white"
                  >
                    <FiEye size={12} />
                    Panorama
                  </button>
                  <button
                    onClick={() => handleDeleteCase(carpeta.id)}
                    disabled={deletingCaseId === carpeta.id}
                    className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-red-300 transition disabled:opacity-50 hover:bg-red-500/20 hover:text-white"
                  >
                    <FiTrash2 size={12} />
                    {deletingCaseId === carpeta.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isViewerOpen && caseViewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-cyan-500/40 bg-slate-800/95 p-8 shadow-[0_0_40px_rgba(0,200,255,0.25)] backdrop-blur-lg">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-mono text-2xl font-semibold tracking-[0.2em] text-cyan-200">
                    Radicado: {caseViewData.nombre.replace("Caso ", "")}
                  </h2>
                  <p className="mt-2 text-slate-300 font-mono text-sm capitalize">
                    Delito: {caseViewData.tipo_delito || 'No especificado'}
                  </p>
                </div>
                <button
                  onClick={closeViewerModal}
                  className="flex items-center gap-1 rounded border border-slate-500/30 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700/40"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="mb-4" />

              {caseViewData.imagen_url && (
                <div className="mb-6 rounded-lg border border-cyan-500/20 bg-slate-950/50 p-4">
                  <img src={caseViewData.imagen_url} alt={caseViewData.nombre} className="h-64 w-full rounded-lg object-cover" />
                </div>
              )}

              <h3 className="mb-4 font-mono text-lg font-semibold tracking-[0.15em] text-cyan-200">
                DOCUMENTOS ({viewerDocumentos.length})
              </h3>

              {viewerLoading ? (
                <div className="font-mono text-cyan-300">Cargando documentos...</div>
              ) : viewerDocumentos.length === 0 ? (
                <div className="rounded-lg border border-slate-500/20 bg-slate-900/50 p-6 text-center">
                  <p className="font-mono text-sm text-slate-400">No hay documentos en este caso.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="space-y-3 lg:col-span-1">
                    <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Archivos</h4>
                    {viewerDocumentos.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          selectedDocument?.id === doc.id
                            ? 'border-cyan-400/60 bg-cyan-500/10'
                            : 'border-slate-500/20 bg-slate-900/50 hover:border-cyan-400/30'
                        }`}
                      >
                        <div className="truncate font-mono text-xs font-semibold text-slate-100">{doc.nombre}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">{doc.descripcion}</div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-cyan-300/60">
                          <FiFile size={12} />
                          PDF
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-500/20 bg-slate-900/70 p-4 lg:col-span-2">
                    {selectedDocument ? (
                      <div className="w-full space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h5 className="font-mono text-sm font-semibold text-slate-100">{selectedDocument.nombre}</h5>
                            <p className="mt-1 text-xs text-slate-400">{selectedDocument.descripcion}</p>
                          </div>
                          <button
                            onClick={() => downloadDocument(selectedDocument)}
                            className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 font-mono text-sm font-semibold text-green-200 transition hover:bg-green-500/20 whitespace-nowrap"
                          >
                            <FiDownload size={16} />
                            Descargar
                          </button>
                        </div>

                        {isPdfFile(selectedDocument.archivo_url) ? (
                          <div className="rounded-lg border border-slate-500/20 bg-slate-950/50 overflow-hidden">
                            <iframe
                              src={getPdfViewerSrc(selectedDocument.archivo_url)}
                              className="h-[520px] w-full border-0"
                              title={selectedDocument.nombre}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 py-8">
                            <FiAlertTriangle size={40} className="text-red-400" />
                            <p className="font-mono text-sm text-red-300">Archivo no válido</p>
                            <p className="text-xs text-slate-400">El visor solo abre PDFs reales (base64 PDF o URL terminada en .pdf).</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <FiFolder size={48} className="text-slate-400" />
                        <p className="font-mono text-sm text-slate-400 text-center">Selecciona un documento para verlo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
            <div className="w-full max-w-sm rounded-2xl border border-slate-500/40 bg-slate-800/95 p-6 shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-lg">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-mono text-lg font-semibold tracking-[0.1em] text-slate-200">
                  CONFIGURACIÓN GLOBAL
                </h3>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="rounded border border-slate-500/30 p-1 text-slate-300 hover:bg-slate-700/40"
                >
                  <FiX size={16} />
                </button>
              </div>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
                    Tiempo Límite (minutos)
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">Este tiempo aplicará para el Modo Caso Complejo en todos los fiscales.</p>
                  <input
                    type="number"
                    min="60"
                    required
                    value={configData.tiempo_limite_minutos}
                    onChange={(e) => setConfigData({ ...configData, tiempo_limite_minutos: parseInt(e.target.value, 10) })}
                    className="mt-2 w-full rounded-lg border border-slate-500/30 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
                  >
                    {savingConfig ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Uploading Progress Overlay */}
      {uploadProgress.uploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-8 text-center shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            </div>
            
            <h3 className="font-mono text-lg font-semibold tracking-wider text-slate-100">
              IMPORTANDO CASOS...
            </h3>
            
            <p className="mt-2 text-sm text-slate-400">
              Procesando {uploadProgress.current} de {uploadProgress.total}
            </p>
            
            <p className="mt-1 truncate font-mono text-xs text-cyan-300">
              {uploadProgress.currentName}
            </p>
            
            {/* Progress Bar */}
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-950">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                }}
              />
            </div>
            
            <p className="mt-2 text-right font-mono text-xs text-cyan-300/80">
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </p>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default DashboardAdmin;
