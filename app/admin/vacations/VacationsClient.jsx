"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/TopBar";

function parseYMD(value) {
  if (!value) return null;
  // Evita desfase horario al crear la fecha en local time
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [_, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDate(value) {
  const d = parseYMD(value);
  if (!d || isNaN(d)) return "-";
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function calcDays(startDate, endDate) {
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  if (!start || !end || isNaN(start) || isNaN(end)) return 0;
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = endUTC - startUTC;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function VacationsClient({ adminName }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const [form, setForm] = useState({
    userId: "",
    startDate: "",
    endDate: "",
    status: "approved",
    note: ""
  });
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/users?role=employee");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error cargando empleados");
        setEmployees(
          (data.users || []).map((u) => ({
            id: u.id,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
              u.username
          }))
        );
      } catch (err) {
        setError(err.message);
      }
    }
    loadEmployees();
  }, []);

  async function loadVacations(userId = filterUser) {
    setLoading(true);
    setError("");
    try {
      const url = userId ? `/api/vacations?userId=${userId}` : "/api/vacations";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Error cargando vacaciones");
      setVacations(data.vacations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVacations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser]);

  function resetForm() {
    setForm({
      userId: "",
      startDate: "",
      endDate: "",
      status: "approved",
      note: ""
    });
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setInfo("");
    const payload = { ...form };
    try {
      const url = editingId ? `/api/vacations/${editingId}` : "/api/vacations";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando vacaciones");
      setInfo(editingId ? "Vacaciones actualizadas." : "Vacaciones creadas.");
      resetForm();
      loadVacations();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(vac) {
    setEditingId(vac.id);
    setForm({
      userId: vac.userId,
      startDate: vac.startDate,
      endDate: vac.endDate,
      status: vac.status,
      note: vac.note || ""
    });
    setInfo("");
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "¿Eliminar estas vacaciones? Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/vacations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error eliminando");
      setVacations((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredVacations = useMemo(() => {
    if (!filterUser) return vacations;
    return vacations.filter((v) => v.userId === filterUser);
  }, [vacations, filterUser]);

  function statusBadge(status) {
    const base =
      "px-2 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1";
    if (status === "pending") {
      return (
        <span className={`${base} bg-amber-50 text-amber-700 border border-amber-100`}>
          Pendiente
        </span>
      );
    }
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-100`}>
        Aprobada
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <TopBar
        userName={adminName}
        subtitle="Vacaciones"
        avatarUrl={avatarUrl}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[11px] text-slate-600">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800 sm:hover:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4 px-0 text-left"
              onClick={() => router.push("/admin")}
            >
              Usuarios
            </button>
            <span
              className="font-semibold text-slate-800 sm:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4"
              aria-current="page"
            >
              Vacaciones
            </span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800 sm:hover:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4 px-0 text-left"
              onClick={() => router.push("/evaluations")}
            >
              Evaluaciones
            </button>
          </div>
        }
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
        }}
      />

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              Gestiona vacaciones de tu equipo
            </p>
            <h2 className="text-lg font-semibold text-slate-800">
              Crear o editar rangos
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Filtrar por empleado</label>
              <select
                className="input text-xs"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <option value="">Todos</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-secondary text-xs px-3 py-2"
              type="button"
              onClick={() => {
                resetForm();
                setInfo("");
                setFormError("");
              }}
            >
              Nueva solicitud
            </button>
          </div>
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          onSubmit={handleSubmit}
        >
          <div className="md:col-span-1">
            <label className="label">Empleado</label>
            <select
              className="input text-xs"
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
            <label className="label">Inicio</label>
            <input
              type="date"
              className="input text-xs"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fin</label>
            <input
              type="date"
              className="input text-xs"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input text-xs"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="approved">Aprobada</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Observación</label>
            <textarea
              className="input text-xs min-h-[70px]"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ej: Viaje, reemplazo coordinado, etc."
            />
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : editingId
                ? "Actualizar"
                : "Crear vacaciones"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        {formError && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
            {formError}
          </p>
        )}
        {info && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
            {info}
          </p>
        )}
        {error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
            {error}
          </p>
        )}
      </div>

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              Calendario de vacaciones
            </p>
            <h3 className="text-lg font-semibold text-slate-800">
              Rango y estado
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Total registros: {filteredVacations.length}
          </span>
        </div>

        <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
          <table className="min-w-full text-xs">
            <thead className="bg-pastel-lila/60">
              <tr className="text-[11px] text-slate-600">
                <th className="px-3 py-2 text-left">Empleado</th>
                <th className="px-3 py-2 text-left">Inicio</th>
                <th className="px-3 py-2 text-left">Fin</th>
                <th className="px-3 py-2 text-left">Días</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Nota</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : filteredVacations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    No hay registros.
                  </td>
                </tr>
              ) : (
                filteredVacations.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-slate-100 hover:bg-pastel-menta/30"
                  >
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {v.userName}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {formatDate(v.startDate)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {formatDate(v.endDate)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {calcDays(v.startDate, v.endDate)} días
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {statusBadge(v.status)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700 max-w-[220px]">
                      <span className="line-clamp-2">{v.note || "-"}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700 space-x-2 whitespace-nowrap">
                      <button
                        className="btn-secondary text-[11px] px-2 py-1"
                        onClick={() => handleEdit(v)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-danger text-[11px] px-2 py-1"
                        onClick={() => handleDelete(v.id)}
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
    </div>
  );
}

