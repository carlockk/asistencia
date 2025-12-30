"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/TopBar";
import RoleNav from "../../components/RoleNav";

function parseYMD(value) {
  if (!value) return null;
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

function calcRemainingDays(startDate, endDate) {
  const today = new Date();
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  if (!start || !end || isNaN(start) || isNaN(end)) return 0;
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diff = endUTC - todayUTC;
  if (diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

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
  if (status === "rejected") {
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border border-rose-100`}>
        Rechazada
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-100`}>
      Aprobada
    </span>
  );
}

export default function VacationsEmployeeClient({ employeeName, roles = [] }) {
  const router = useRouter();
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    note: ""
  });
  const [avatarUrl, setAvatarUrl] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vacations/my");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando vacaciones");
      setVacations(data.vacations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    async function loadAvatar() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          const url = data.user.avatarUrl || data.user.avatar_url || "";
          if (url) setAvatarUrl(url);
        }
      } catch {
        // ignore avatar errors
      }
    }
    loadAvatar();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/vacations/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error enviando solicitud");
      setInfo("Solicitud enviada. Queda pendiente de aprobacion.");
      setForm({ startDate: "", endDate: "", note: "" });
      setVacations((prev) => [data.vacation, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const approved = vacations.filter((v) => v.status === "approved");
    const pending = vacations.filter((v) => v.status === "pending");
    return {
      approvedDays: approved.reduce(
        (sum, v) => sum + calcDays(v.startDate, v.endDate),
        0
      ),
      pendingDays: pending.reduce(
        (sum, v) => sum + calcDays(v.startDate, v.endDate),
        0
      )
    };
  }, [vacations]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="w-full">
      <TopBar
        userName={employeeName}
        subtitle="Mis vacaciones"
        avatarUrl={avatarUrl}
        actions={
          <RoleNav
            roles={roles}
            active="/employee/vacations"
            onNavigate={router.push}
          />
        }
        onLogout={handleLogout}
      />

      <div className="space-y-4 px-4 pb-4">
        <div className="card p-5 md:p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              Solicita tus vacaciones y revisa su estado
            </p>
            <h2 className="text-lg font-semibold text-slate-800">
              Nueva solicitud
            </h2>
          </div>

          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            onSubmit={handleSubmit}
          >
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
            <div className="md:col-span-2">
              <label className="label">Nota (opcional)</label>
              <input
                className="input text-xs"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ej: Viaje familiar, reemplazo coordinado, etc."
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>

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
              <p className="text-xs text-slate-500 mb-1">Historial</p>
              <h3 className="text-lg font-semibold text-slate-800">
                Tus solicitudes
              </h3>
            </div>
            <div className="text-[11px] text-slate-600 space-x-3">
              <span>Dias aprobados: {summary.approvedDays}</span>
              <span className="text-amber-700">
                Pendientes: {summary.pendingDays}
              </span>
            </div>
          </div>

          <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
            <table className="min-w-full text-xs">
              <thead className="bg-pastel-celeste/60">
                <tr className="text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Fin</th>
                  <th className="px-3 py-2 text-left">Dias</th>
                  <th className="px-3 py-2 text-left">Restantes</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Nota</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : vacations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                      No tienes solicitudes registradas.
                    </td>
                  </tr>
                ) : (
                  vacations.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-slate-100 hover:bg-pastel-menta/30"
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {formatDate(v.startDate)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {formatDate(v.endDate)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {calcDays(v.startDate, v.endDate)} dias
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {calcRemainingDays(v.startDate, v.endDate)} dias
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">
                        {statusBadge(v.status)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 max-w-[240px]">
                        <span className="line-clamp-2">{v.note || "-"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
