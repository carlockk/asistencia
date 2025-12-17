"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/TopBar";
import AdminNav from "../../components/AdminNav";

const typeOptions = [
  { value: "Contrato", label: "Contrato" },
  { value: "Anexo", label: "Anexo" },
  { value: "Licencia medica", label: "Licencia medica" },
  { value: "Permiso", label: "Permiso" },
  { value: "Renuncia", label: "Renuncia" },
  { value: "Finiquito", label: "Finiquito" },
  { value: "Pre natal", label: "Pre natal" },
  { value: "Post natal", label: "Post natal" },
  { value: "Seguro / Mutual", label: "Seguro / Mutual" },
  { value: "Otros", label: "Otros" }
];

const statusOptions = [
  { value: "vigente", label: "Vigente" },
  { value: "en_revision", label: "En revision" },
  { value: "archivado", label: "Archivado" }
];

const baseForm = {
  userId: "",
  type: typeOptions[0].value,
  title: "",
  status: "vigente",
  issuedAt: "",
  expiresAt: "",
  notes: "",
  fileUrl: "",
  fileName: ""
};

function formatDate(value) {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function statusBadge(status) {
  const base =
    "px-2 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1";
  if (status === "vencido") {
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border border-rose-100`}>
        Vencido
      </span>
    );
  }
  if (status === "por_vencer") {
    return (
      <span className={`${base} bg-amber-50 text-amber-700 border border-amber-100`}>
        Por vencer
      </span>
    );
  }
  if (status === "en_revision") {
    return (
      <span className={`${base} bg-sky-50 text-sky-700 border border-sky-100`}>
        En revision
      </span>
    );
  }
  if (status === "archivado") {
    return (
      <span className={`${base} bg-slate-100 text-slate-700 border border-slate-200`}>
        Archivado
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-100`}>
      Vigente
    </span>
  );
}

function expiryLabel(doc) {
  if (!doc.expiresAt) return "-";
  if (typeof doc.daysToExpire === "number") {
    if (doc.daysToExpire < 0) {
      return `Vencido hace ${Math.abs(doc.daysToExpire)} dias`;
    }
    if (doc.daysToExpire === 0) {
      return "Vence hoy";
    }
    return `Vence en ${doc.daysToExpire} dias`;
  }
  return formatDate(doc.expiresAt);
}

export default function DocumentsClient({ adminName }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    userId: "",
    type: "",
    status: "",
    query: "",
    criticalOnly: false
  });
  const [form, setForm] = useState({ ...baseForm });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const nav = (
    <AdminNav active="/admin/documents" onNavigate={(path) => router.push(path)} />
  );

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/users?role=employee");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error cargando empleados");
        setEmployees(
          (data.users || []).map((u) => ({
            id: u.id,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
          }))
        );
      } catch (err) {
        setError(err.message);
      }
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    async function loadAvatar() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          const u = data.user;
          const url = u.avatarUrl || u.avatar_url || "";
          if (url) setAvatarUrl(url);
        }
      } catch {
        // ignore avatar errors
      }
    }
    loadAvatar();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.query) params.set("q", filters.query);

      const url = params.toString() ? `/api/documents?${params.toString()}` : "/api/documents";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando documentos");
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.type, filters.status, filters.query]);

  const filteredDocuments = useMemo(() => {
    if (!filters.criticalOnly) return documents;
    return documents.filter(
      (d) => d.computedStatus === "vencido" || d.computedStatus === "por_vencer"
    );
  }, [documents, filters.criticalOnly]);

  const stats = useMemo(() => {
    const total = documents.length;
    const expired = documents.filter((d) => d.computedStatus === "vencido").length;
    const expiring = documents.filter((d) => d.computedStatus === "por_vencer").length;
    return { total, expired, expiring };
  }, [documents]);

  function resetForm() {
    setForm({ ...baseForm });
    setEditingId(null);
  }

  function startEdit(doc) {
    setForm({
      userId: doc.userId || "",
      type: doc.type || typeOptions[0].value,
      title: doc.title || "",
      status: doc.status || "vigente",
      issuedAt: doc.issuedAt || "",
      expiresAt: doc.expiresAt || "",
      notes: doc.notes || "",
      fileUrl: doc.fileUrl || "",
      fileName: doc.fileName || ""
    });
    setEditingId(doc.id);
    setInfo("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "¿Eliminar este documento? Esta accion no se puede deshacer."
    );
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error eliminando documento");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const payload = { ...form };
      const url = editingId ? `/api/documents/${editingId}` : "/api/documents";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando documento");
      setInfo(editingId ? "Documento actualizado." : "Documento creado.");
      resetForm();
      loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setInfo("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error subiendo archivo");
      setForm((prev) => ({
        ...prev,
        fileUrl: data.url,
        fileName: data.originalFilename || file.name || prev.fileName
      }));
      setInfo("Archivo subido. Guarda para asociarlo al registro.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function buildPreviewUrl(url) {
    if (!url) return "";
    const lower = url.toLowerCase();
    const isPdf = lower.includes(".pdf");
    const isImage =
      lower.includes(".png") ||
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".gif") ||
      lower.includes(".webp") ||
      lower.includes("image/upload");

    if (isPdf || isImage) return url;
    return ""; // otros tipos no se embeberan
  }

  function buildDownloadUrl(doc) {
    if (!doc?.fileUrl) return "";
    const fileName =
      doc.fileName ||
      `${(doc.type || "documento").replace(/\s+/g, "-").toLowerCase()}.docx`;
    const sep = doc.fileUrl.includes("?") ? "&" : "?";
    return `${doc.fileUrl}${sep}fl_attachment=${encodeURIComponent(fileName)}`;
  }

  function openPreview(doc) {
    if (!doc.fileUrl) return;
    const embedUrl = buildPreviewUrl(doc.fileUrl);
    if (!embedUrl) {
      const downloadUrl = buildDownloadUrl(doc) || doc.fileUrl;
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewUrl(embedUrl);
    setPreviewTitle(doc.fileName || doc.title || "Documento");
    setShowPreview(true);
  }

  return (
    <div className="space-y-4">
      <TopBar
        userName={adminName}
        subtitle="Documentos"
        avatarUrl={avatarUrl}
        actions={nav}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
        }}
      />

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Biblioteca por empleado</p>
            <h2 className="text-lg font-semibold text-slate-800">Documentos laborales</h2>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Empleado</label>
              <select
                className="input text-xs"
                value={filters.userId}
                onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
              >
                <option value="">Todos</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                className="input text-xs"
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Todos</option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado guardado</label>
              <select
                className="input text-xs"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Todos</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Buscar</label>
              <input
                className="input text-xs"
                placeholder="Titulo, tipo o nota"
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-slate-700 mb-1">
              <input
                type="checkbox"
                className="accent-banco-rojo"
                checked={filters.criticalOnly}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, criticalOnly: e.target.checked }))
                }
              />
              Solo vencidos / por vencer
            </label>
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-2"
              onClick={() =>
                setFilters({
                  userId: "",
                  type: "",
                  status: "",
                  query: "",
                  criticalOnly: false
                })
              }
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/80 border border-slate-100 p-3">
            <p className="text-[11px] text-slate-500 mb-1">Total registros</p>
            <p className="text-2xl font-semibold text-slate-800">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-[11px] text-amber-700 mb-1">Por vencer (30 dias)</p>
            <p className="text-2xl font-semibold text-amber-800">{stats.expiring}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3">
            <p className="text-[11px] text-rose-700 mb-1">Vencidos</p>
            <p className="text-2xl font-semibold text-rose-800">{stats.expired}</p>
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
            {error}
          </p>
        )}
        {info && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
            {info}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
        <div className="card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Listado de documentos {filters.criticalOnly ? "criticos" : ""}
              </p>
              <h3 className="text-lg font-semibold text-slate-800">
                {filteredDocuments.length} registro{filteredDocuments.length === 1 ? "" : "s"}
              </h3>
            </div>
          </div>

          <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
            <table className="min-w-full text-xs">
              <thead className="bg-pastel-lila/60">
                <tr className="text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">Empleado</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Titulo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Emision</th>
                  <th className="px-3 py-2 text-left">Vencimiento</th>
                  <th className="px-3 py-2 text-left">Archivo</th>
                  <th className="px-3 py-2 text-left">Notas</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-slate-400">
                      No hay documentos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t border-slate-100 hover:bg-pastel-menta/30"
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-semibold">{doc.userName}</span>
                          <span className="text-slate-500">
                            {doc.uploadedByName
                              ? `Cargado por ${doc.uploadedByName}`
                              : doc.userId
                              ? `ID ${String(doc.userId).slice(-6)}`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{doc.type}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 max-w-[200px]">
                        <span className="line-clamp-2">{doc.title || "Sin titulo"}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 whitespace-nowrap">
                        {statusBadge(doc.computedStatus)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {doc.issuedAt ? formatDate(doc.issuedAt) : "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex flex-col">
                          <span>{doc.expiresAt ? formatDate(doc.expiresAt) : "-"}</span>
                          <span className="text-[10px] text-slate-500">
                            {expiryLabel(doc)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex flex-col gap-1">
                          {doc.fileUrl ? (
                            <>
                              <button
                                type="button"
                                className="text-banco-rojo underline decoration-2 underline-offset-4 text-left"
                                onClick={() => openPreview(doc)}
                              >
                                Ver archivo
                              </button>
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 max-w-[220px]">
                        <span className="line-clamp-2">{doc.notes || "-"}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 space-x-2 whitespace-nowrap">
                        <button
                          className="btn-secondary text-[11px] px-2 py-1"
                          onClick={() => startEdit(doc)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-danger text-[11px] px-2 py-1"
                          onClick={() => handleDelete(doc.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                {editingId ? "Editar documento" : "Subir nuevo documento"}
              </p>
              <h3 className="text-lg font-semibold text-slate-800">
                {editingId ? "Edicion" : "Registro rapido"}
              </h3>
            </div>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar edicion
              </button>
            )}
          </div>

          <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Empleado</label>
                <select
                  className="input"
                  required
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                >
                  <option value="">Selecciona</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Titulo</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Contrato indefinido 2024"
                />
              </div>
              <div>
                <label className="label">Estado guardado</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha emision</label>
                <input
                  type="date"
                  className="input"
                  value={form.issuedAt}
                  onChange={(e) => setForm({ ...form, issuedAt: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Fecha vencimiento (opcional)</label>
                <input
                  type="date"
                  className="input"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Notas internas</label>
              <textarea
                className="input min-h-[70px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Licencia medica, permiso especial, etc."
              />
            </div>

            <div className="space-y-2">
              <label className="label">Archivo (opcional)</label>
              <input
                className="input"
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="https:// o sube un archivo"
              />
              <div className="flex flex-col gap-1 text-[12px] text-slate-600">
                <input
                  type="file"
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="text-[12px]"
                />
                {uploading ? (
                  <span className="text-[11px] text-slate-500">Subiendo archivo...</span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Acepta imagenes o PDF/DOC. Se almacenara en Cloudinary.
                  </span>
                )}
                {form.fileName && (
                  <span className="text-[11px] text-slate-600">
                    Archivo: {form.fileName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear documento"}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showPreview && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowPreview(false);
            setPreviewUrl("");
            setPreviewTitle("");
          }}
        >
          <div
            className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/90">
              <div className="text-sm font-semibold text-slate-800 truncate">
                {previewTitle}
              </div>
              <button
                type="button"
                className="text-slate-600 hover:text-slate-800"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewUrl("");
                  setPreviewTitle("");
                }}
                aria-label="Cerrar visor"
              >
                &times;
              </button>
            </div>
            <iframe
              src={previewUrl}
              title={previewTitle}
              className="w-full flex-1"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </div>
  );
}
