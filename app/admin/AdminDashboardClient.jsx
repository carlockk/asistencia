"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";

export default function AdminDashboardClient({ adminName }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("employee");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [editError, setEditError] = useState("");
  const [info, setInfo] = useState("");
  const [editInfo, setEditInfo] = useState("");
  const [page, setPage] = useState(1);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [viewRecords, setViewRecords] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingCreateAvatar, setUploadingCreateAvatar] = useState(false);
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false);
  const pageSize = 10;

  const baseForm = {
    username: "",
    password: "",
    role: "employee",
    firstName: "",
    lastName: "",
    docType: "RUT",
    docNumber: "",
    address: "",
    commune: "",
    city: "",
    email: "",
    hourlyRate: "",
    observation: "",
    avatarUrl: ""
  };

  const [form, setForm] = useState({
    ...baseForm
  });
  const [editForm, setEditForm] = useState({ ...baseForm });

  function normalizeUser(u) {
    return {
      ...u,
      avatarUrl: u?.avatarUrl || u?.avatar_url || ""
    };
  }

  async function fetchUsers(currentRole = roleFilter) {
    setLoading(true);
    setListError("");
    try {
      const res = await fetch(`/api/users?role=${currentRole}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando usuarios");
      setUsers((data.users || []).map(normalizeUser));
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, users.length]);

  // Cargar avatar del usuario logueado para el TopBar
  useEffect(() => {
    async function loadAvatar() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          const u = data.user;
          const url = u.avatarUrl || u.avatar_url || "";
          if (url) {
            setAvatarUrl(url);
          }
        }
      } catch {
        // ignorar errores de avatar
      }
    }
    loadAvatar();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error creando usuario");

      setInfo("Usuario creado correctamente.");
      setForm({ ...baseForm });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadUserForEdit(userId) {
    setEditError("");
    setEditInfo("");
    setEditingId(userId);
    setShowEditModal(true);
    setEditSaving(false);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando usuario");
      setEditForm({
        ...baseForm,
        ...normalizeUser(data.user),
        password: "",
        hourlyRate: data.user.hourlyRate ?? ""
      });
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError("");
    setEditInfo("");
    try {
      const payload = { ...editForm };
      if (!payload.password) {
        delete payload.password;
      }
      payload.hourlyRate =
        payload.hourlyRate === "" ? 0 : Number(payload.hourlyRate);

      const res = await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando usuario");
      setEditInfo("Usuario actualizado correctamente.");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? {
                ...normalizeUser({ ...u, ...payload })
              }
            : u
        )
      );
      fetchUsers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function handleAvatarFileChange(e, setter, mode = "create") {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading =
      mode === "edit" ? setUploadingEditAvatar : setUploadingCreateAvatar;
    const setErrorFn = mode === "edit" ? setEditError : setError;
    const setInfoFn = mode === "edit" ? setEditInfo : setInfo;

    setErrorFn("");
    setInfoFn("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error subiendo la imagen");
      setter((prev) => ({ ...prev, avatarUrl: data.url }));
      setInfoFn(
        mode === "edit"
          ? "Imagen subida. Guarda para aplicar cambios."
          : "Imagen subida correctamente."
      );
    } catch (err) {
      setErrorFn(err.message);
    } finally {
      setUploading(false);
    }
  }

  function formatTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function normalizeMinutes(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMinutes(value) {
    const minutes = normalizeMinutes(value);
    if (minutes === 0) return "0";
    return minutes % 1 === 0 ? minutes.toFixed(0) : minutes.toFixed(2);
  }

  function hoursLabel(totalMinutes) {
    let hours = Math.floor(totalMinutes / 60);
    let remaining =
      Math.round((totalMinutes - hours * 60) * 100) / 100;
    if (remaining >= 60) {
      hours += 1;
      remaining -= 60;
    }
    const minutesText =
      remaining % 1 === 0 ? remaining.toFixed(0) : remaining.toFixed(2);
    return `${hours}h ${minutesText}m`;
  }

  function computeTotals(records, hourlyRate = 0) {
    const totalMinutes = records.reduce(
      (sum, r) => sum + normalizeMinutes(r.minutesWorked),
      0
    );
    const hoursDecimal =
      Math.round((totalMinutes / 60) * 100) / 100;
    const amount =
      Math.round(((totalMinutes * hourlyRate) / 60) * 100) / 100;
    return {
      totalMinutes,
      hoursDecimal,
      hoursLabel: hoursLabel(totalMinutes),
      amount
    };
  }

  async function handleViewEmployee(userId) {
    setShowViewModal(true);
    setViewLoading(true);
    setViewError("");
    setViewEmployee(null);
    setViewRecords([]);
    try {
      const res = await fetch(`/api/attendance/by-employee/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando detalle");
      setViewEmployee(data.employee);
      setViewRecords(data.records || []);
    } catch (err) {
      setViewError(err.message);
    } finally {
      setViewLoading(false);
    }
  }

  const viewTotals = computeTotals(
    viewRecords,
    viewEmployee?.hourlyRate || 0
  );

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full">
      <TopBar
        userName={adminName}
        subtitle="Panel administrador"
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[11px] text-slate-600">
            <span className="hidden sm:inline">Gestiona usuarios y asistencia</span>
            <span
              className="font-semibold text-slate-800 sm:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4"
              aria-current="page"
            >
              Usuarios
            </span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800 sm:hover:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4 px-0 text-left"
              onClick={() => router.push("/admin/vacations")}
            >
              Vacaciones
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-4 pb-4">
        <div className="card p-5 md:p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex gap-2 text-xs flex-wrap items-end">
                <button
                  className={`px-3 py-2 rounded-t-md border-b-2 transition ${
                    roleFilter === "employee"
                      ? "border-banco-rojo text-slate-800 bg-white shadow-soft"
                      : "border-transparent text-slate-500 bg-white/60"
                  }`}
                  onClick={() => setRoleFilter("employee")}
                >
                  Empleados
                </button>
                <button
                  className={`px-3 py-2 rounded-t-md border-b-2 transition ${
                    roleFilter === "admin"
                      ? "border-banco-rojo text-slate-800 bg-white shadow-soft"
                      : "border-transparent text-slate-500 bg-white/60"
                  }`}
                  onClick={() => setRoleFilter("admin")}
                >
                  Admins
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[11px] text-slate-500">
                  Puedes crear empleados y administradores. Luego podran iniciar
                  sesion con su usuario y contrasena.
                </p>
                <button
                  className="btn-primary w-full md:w-auto"
                  onClick={() => {
                    setShowCreateModal(true);
                    setError("");
                    setInfo("");
                  }}
                >
                  Crear usuario
                </button>
              </div>
            </div>

            {listError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
                {listError}
              </p>
            )}
            {info && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
                {info}
              </p>
            )}
          </div>

          <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
            <table className="min-w-full text-xs">
              <thead className="bg-pastel-lila/60">
                <tr className="text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Documento</th>
                  <th className="px-3 py-2 text-left">Comuna</th>
                  <th className="px-3 py-2 text-left">Ciudad</th>
                  <th className="px-3 py-2 text-left">Direccion</th>
                  <th className="px-3 py-2 text-left">Correo</th>
                  <th className="px-3 py-2 text-left">Valor hora</th>
                  <th className="px-3 py-2 text-left">Obs.</th>
                  <th className="px-3 py-2 text-left">Editar</th>
                  {roleFilter === "employee" && (
                    <th className="px-3 py-2 text-left">Asistencia</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={roleFilter === "employee" ? 10 : 9}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={roleFilter === "employee" ? 10 : 9}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-slate-100 hover:bg-pastel-menta/30"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.firstName || u.username}
                              className="h-7 w-7 rounded-full object-cover border border-white/70 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center border border-white/70 shadow-sm">
                              {(u.firstName || u.username || "U")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div className="font-medium text-xs">
                              {u.firstName || "Sin nombre"} {u.lastName || ""}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {u.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.docType} {u.docNumber}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.commune || "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.city || "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.address || "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.email}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {u.hourlyRate
                          ? `$${u.hourlyRate.toLocaleString("es-CL")}/h`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">
                        {u.observation || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          className="btn-secondary text-[11px] px-3 py-1"
                          onClick={() => loadUserForEdit(u.id)}
                        >
                          Editar
                        </button>
                      </td>
                      {roleFilter === "employee" && (
                        <td className="px-3 py-2">
                          <button
                            className="btn-secondary text-[11px] px-3 py-1"
                            onClick={() => handleViewEmployee(u.id)}
                          >
                            Ver
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Pagina {currentPage} de {totalPages} ({users.length} usuarios)
            </span>
            <div className="flex gap-3 text-slate-800 font-semibold">
              <button
                className={`text-[11px] ${
                  currentPage <= 1
                    ? "opacity-40 cursor-not-allowed"
                    : "underline"
                }`}
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                className={`text-[11px] ${
                  currentPage >= totalPages
                    ? "opacity-40 cursor-not-allowed"
                    : "underline"
                }`}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card p-5 md:p-6 relative max-h-[90vh] overflow-auto">
              <button
                type="button"
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                onClick={() => setShowCreateModal(false)}
                aria-label="Cerrar modal de creacion"
              >
                ✕
              </button>
              <h3 className="text-sm font-semibold text-slate-800 mb-1 pr-8">
                Crear usuario
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 pr-8">
                Completa los datos para crear un empleado o administrador. El
                nuevo usuario podra iniciar sesion con su usuario y contrasena.
              </p>

              {error && (
                <p className="text-[11px] mb-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-[11px] mb-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
                  {info}
                </p>
              )}

              <form className="space-y-3 text-xs" onSubmit={handleCreate}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Usuario *</label>
                    <input
                      className="input"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Contrasena *</label>
                    <input
                      type="password"
                      className="input"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Apellido</label>
                    <input
                      className="input"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipo doc</label>
                    <select
                      className="input"
                      value={form.docType}
                      onChange={(e) =>
                        setForm({ ...form, docType: e.target.value })
                      }
                    >
                      <option value="RUT">RUT</option>
                      <option value="DNI">DNI</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">No documento</label>
                    <input
                      className="input"
                      value={form.docNumber}
                      onChange={(e) =>
                        setForm({ ...form, docNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Comuna</label>
                    <input
                      className="input"
                      value={form.commune}
                      onChange={(e) =>
                        setForm({ ...form, commune: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Ciudad</label>
                    <input
                      className="input"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Direccion</label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Correo</label>
                    <input
                      className="input"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Valor hora ($)</label>
                    <input
                      type="number"
                      className="input"
                      value={form.hourlyRate}
                      onChange={(e) =>
                        setForm({ ...form, hourlyRate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label">URL foto de perfil</label>
                  <input
                    className="input"
                    value={form.avatarUrl}
                    onChange={(e) =>
                      setForm({ ...form, avatarUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px] text-slate-600 mt-2"
                    onChange={(e) => handleAvatarFileChange(e, setForm, "create")}
                    disabled={uploadingCreateAvatar}
                  />
                  {uploadingCreateAvatar && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subiendo imagen a Cloudinary...
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Observacion</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={form.observation}
                    onChange={(e) =>
                      setForm({ ...form, observation: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="label">Rol</label>
                    <select
                      className="input"
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Crear usuario"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4"
          onClick={() => {
            setShowEditModal(false);
            setEditingId(null);
            setEditForm({ ...baseForm });
          }}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card p-5 md:p-6 relative max-h-[90vh] overflow-auto">
              <button
                type="button"
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                  setEditForm({ ...baseForm });
                }}
                aria-label="Cerrar modal de edicion"
              >
                ✕
              </button>
              <h3 className="text-sm font-semibold text-slate-800 mb-1 pr-8">
                Editar usuario
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 pr-8">
                Actualiza los datos del usuario seleccionado.
              </p>

              {editError && (
                <p className="text-[11px] mb-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
                  {editError}
                </p>
              )}
              {editInfo && (
                <p className="text-[11px] mb-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
                  {editInfo}
                </p>
              )}

              <form className="space-y-3 text-xs" onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Usuario</label>
                    <input
                      className="input"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm({ ...editForm, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Contrasena (opcional)</label>
                    <input
                      type="password"
                      className="input"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm({ ...editForm, password: e.target.value })
                      }
                      placeholder="Dejar vacio para mantener"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          firstName: e.target.value
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Apellido</label>
                    <input
                      className="input"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          lastName: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipo doc</label>
                    <select
                      className="input"
                      value={editForm.docType}
                      onChange={(e) =>
                        setEditForm({ ...editForm, docType: e.target.value })
                      }
                    >
                      <option value="RUT">RUT</option>
                      <option value="DNI">DNI</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">No documento</label>
                    <input
                      className="input"
                      value={editForm.docNumber}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          docNumber: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Comuna</label>
                    <input
                      className="input"
                      value={editForm.commune}
                      onChange={(e) =>
                        setEditForm({ ...editForm, commune: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Ciudad</label>
                    <input
                      className="input"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Direccion</label>
                  <input
                    className="input"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Correo</label>
                    <input
                      className="input"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Valor hora ($)</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.hourlyRate}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          hourlyRate: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Observacion</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={editForm.observation}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        observation: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">URL foto de perfil</label>
                  <input
                    className="input"
                    value={editForm.avatarUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, avatarUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px] text-slate-600 mt-2"
                    onChange={(e) => handleAvatarFileChange(e, setEditForm, "edit")}
                    disabled={uploadingEditAvatar}
                  />
                  {uploadingEditAvatar && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subiendo imagen a Cloudinary...
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={editSaving}
                  >
                    {editSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4"
          onClick={() => {
            setShowViewModal(false);
            setViewEmployee(null);
            setViewRecords([]);
          }}
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="card p-5 md:p-6 relative max-h-[90vh] overflow-auto">
              <button
                type="button"
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setShowViewModal(false);
                  setViewEmployee(null);
                  setViewRecords([]);
                }}
                aria-label="Cerrar modal de detalle"
              >
                ✕
              </button>

              <div className="flex items-center justify-between gap-3 pr-8">
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Detalle de empleado
                  </p>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {viewEmployee
                      ? `${viewEmployee.firstName || ""} ${
                          viewEmployee.lastName || ""
                        }`.trim() || viewEmployee.username
                      : "Empleado"}
                  </h3>
                  {viewEmployee?.hourlyRate ? (
                    <p className="text-[11px] text-slate-600">
                      Valor hora: $
                      {viewEmployee.hourlyRate.toLocaleString("es-CL")}
                    </p>
                  ) : null}
                </div>
              </div>

              {viewError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl mt-3">
                  {viewError}
                </p>
              )}

              {viewLoading ? (
                <p className="text-sm text-slate-500 mt-3">
                  Cargando registros...
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[1.3fr,1fr] gap-4 mt-4">
                  <div className="space-y-3">
                    <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70 max-h-[360px]">
                      <table className="min-w-full text-xs">
                        <thead className="bg-pastel-celeste/60">
                          <tr className="text-[11px] text-slate-600">
                            <th className="px-3 py-2 text-left">Fecha</th>
                            <th className="px-3 py-2 text-left">Entrada</th>
                            <th className="px-3 py-2 text-left">Salida</th>
                            <th className="px-3 py-2 text-left">Minutos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewRecords.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-slate-400"
                              >
                                No hay registros disponibles.
                              </td>
                            </tr>
                          ) : (
                            viewRecords.map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-slate-100 hover:bg-pastel-rosa/30"
                              >
                                <td className="px-3 py-2 text-[11px] text-slate-700">
                                  {r.date}
                                </td>
                                <td className="px-3 py-2 text-[11px] text-slate-700">
                                  {formatTime(r.entryTime)}
                                </td>
                                <td className="px-3 py-2 text-[11px] text-slate-700">
                                  {formatTime(r.exitTime)}
                                </td>
                              <td className="px-3 py-2 text-[11px] text-slate-700">
                                  {formatMinutes(r.minutesWorked)} min
                              </td>
                            </tr>
                          ))
                        )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-banco-amarillo via-pastel-rosa to-pastel-lila p-4 flex flex-col justify-between shadow-soft">
                    <div>
                      <p className="text-xs text-slate-700 mb-1 font-semibold">
                        Resumen del periodo
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 mb-1">
                        {viewTotals.hoursLabel}
                      </h3>
                      <p className="text-xs text-slate-700">
                        Total minutos: {formatMinutes(viewTotals.totalMinutes)}{" "}
                        min
                      </p>
                    </div>
                    <div className="mt-4 space-y-1 text-xs">
                      <p className="flex justify-between">
                        <span>Valor hora:</span>
                        <span className="font-semibold">
                          {viewEmployee?.hourlyRate
                            ? `$${viewEmployee.hourlyRate.toLocaleString(
                                "es-CL"
                              )}`
                            : "-"}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>Monto a pagar:</span>
                        <span className="font-semibold text-banco-rojo">
                          {viewEmployee?.hourlyRate
                            ? `$${viewTotals.amount.toLocaleString("es-CL", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}`
                            : "-"}
                      </span>
                    </p>
                      <p className="text-[11px] text-slate-700 mt-2">
                        Usa los filtros del panel dedicado si necesitas un
                        rango de fechas especifico.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
