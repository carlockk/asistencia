"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import { ReadOnlyTree } from "./components/TreeEditor";
import { ratingLabel } from "./utils";
import { useAvatar } from "./useAvatar";

const pageSize = 10;

export default function EvaluationListClient({ adminName }) {
  const router = useRouter();
  const avatarUrl = useAvatar();

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [evaluations, setEvaluations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewEval, setViewEval] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [summary, setSummary] = useState(null);

  const topEmployees = useMemo(() => {
    if (!summary?.byEmployee) return [];
    return [...summary.byEmployee]
      .map((item) => ({
        ...item,
        rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
  }, [summary]);

  const topChecklists = useMemo(() => {
    if (!summary?.byChecklist) return [];
    return [...summary.byChecklist]
      .map((item) => ({
        ...item,
        rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
  }, [summary]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [usersRes, checklistsRes] = await Promise.all([
          fetch("/api/users?role=employee"),
          fetch("/api/checklists")
        ]);
        if (usersRes.ok) {
          const data = await usersRes.json();
          const mapped = (data.users || []).map((u) => ({
            id: u.id,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
          }));
          setEmployees(mapped);
        }
        if (checklistsRes.ok) {
          const data = await checklistsRes.json();
          setChecklists(data.checklists || []);
        }
      } catch (err) {
        // silencioso, se maneja en la carga principal
        console.error("Error precargando filtros", err);
      }
    }
    loadMeta();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", page);
        params.set("pageSize", pageSize);
        if (q.trim()) params.set("q", q.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (employeeId) params.set("employeeId", employeeId);
        if (checklistId) params.set("checklistId", checklistId);
        if (status) params.set("status", status);
        const res = await fetch(`/api/evaluations?${params.toString()}`, {
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error cargando evaluaciones");
        setEvaluations(data.evaluations || []);
        setTotal(data.total || 0);
        setSummary(data.summary || null);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [q, from, to, page, employeeId, checklistId, status]);

  async function handleView(id) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/evaluations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando detalle");
      setViewEval(data.evaluation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleCloseTab() {
    if (typeof window !== "undefined") {
      window.close();
      // Por si window.close no funciona, redirigimos.
      router.push("/evaluations");
    }
  }

  function clearFilters() {
    setQ("");
    setFrom("");
    setTo("");
    setEmployeeId("");
    setChecklistId("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <TopBar
        userName={adminName}
        subtitle="Listado de evaluaciones"
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
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800 sm:hover:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4 px-0 text-left"
              onClick={() => router.push("/admin/vacations")}
            >
              Vacaciones
            </button>
            <span className="font-semibold text-slate-800 sm:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4">
              Evaluaciones
            </span>
          </div>
        }
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
        }}
      />

      <div className="card p-5 md:p-6 space-y-4">
        <div className="sm:hidden flex justify-end">
          <button
            type="button"
            className="btn-secondary text-[12px]"
            onClick={handleCloseTab}
          >
            Cerrar
          </button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-slate-500">Filtra y busca en tiempo real</p>
            <h2 className="text-lg font-semibold text-slate-800">Evaluaciones</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn-secondary text-[12px]" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Buscar (checklist, evaluador, empleado, notas)</label>
            <input
              className="input"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Ej: higiene, Juan, seguridad"
            />
          </div>
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label">Empleado</label>
            <select
              className="input"
              value={employeeId}
              onChange={(e) => {
                setPage(1);
                setEmployeeId(e.target.value);
              }}
            >
              <option value="">Todos</option>
              <option value="none">General (sin empleado)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Checklist</label>
            <select
              className="input"
              value={checklistId}
              onChange={(e) => {
                setPage(1);
                setChecklistId(e.target.value);
              }}
            >
              <option value="">Todos</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completada</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
            {error}
          </p>
        )}

        {summary && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="border border-slate-100 rounded-2xl bg-white/70 p-4">
              <p className="text-[11px] text-slate-500">Cumplimiento</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-semibold text-slate-800">
                  {summary.completionRate || 0}%
                </h3>
                <span className="text-[12px] text-slate-600">
                  {summary.completed} / {summary.total} completadas
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-banco-rojo transition-all"
                  style={{ width: `${summary.completionRate || 0}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Pendientes: {summary.pending || 0}
              </div>
            </div>
            <div className="border border-slate-100 rounded-2xl bg-white/70 p-4">
              <p className="text-[11px] text-slate-500 mb-1">Top empleados</p>
              {topEmployees.length === 0 ? (
                <p className="text-[12px] text-slate-500">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {topEmployees.map((emp) => (
                    <div key={emp.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[12px] text-slate-800 font-semibold">
                          {emp.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {emp.completed} / {emp.total} completadas
                        </p>
                      </div>
                      <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${emp.rate}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-700 w-10 text-right">
                        {emp.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border border-slate-100 rounded-2xl bg-white/70 p-4">
              <p className="text-[11px] text-slate-500 mb-1">Top checklists</p>
              {topChecklists.length === 0 ? (
                <p className="text-[12px] text-slate-500">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {topChecklists.map((chk) => (
                    <div key={chk.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[12px] text-slate-800 font-semibold">
                          {chk.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {chk.completed} / {chk.total} completadas
                        </p>
                      </div>
                      <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${chk.rate}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-700 w-10 text-right">
                        {chk.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
          <table className="min-w-full text-xs">
            <thead className="bg-pastel-lila/60">
              <tr className="text-[11px] text-slate-600">
                <th className="px-3 py-2 text-left">Checklist</th>
                <th className="px-3 py-2 text-left">Evaluador</th>
                <th className="px-3 py-2 text-left">Empleado</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Creada</th>
                <th className="px-3 py-2 text-left">Enviada</th>
                <th className="px-3 py-2 text-left">Ver</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                    No hay evaluaciones.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-t border-slate-100 hover:bg-pastel-rosa/30"
                  >
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {ev.checklistTitle}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {ev.evaluatorName}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {ev.employeeName || "General"}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {ev.status === "completed" ? (
                        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                          Completada
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-semibold">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {new Date(ev.createdAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {ev.submittedAt
                        ? new Date(ev.submittedAt).toLocaleDateString("es-CL")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <button
                        type="button"
                        className="text-slate-700 underline decoration-banco-rojo decoration-2 underline-offset-4"
                        onClick={() => handleView(ev.id)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[12px] text-slate-600">
          <span>
            Pagina {page} de {totalPages} ({total} evaluaciones)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {viewEval && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4"
          onClick={() => setViewEval(null)}
        >
          <div
            className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-5 md:p-6 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Detalle de evaluacion</p>
                <h3 className="text-lg font-semibold text-slate-800">
                  {viewEval.checklist?.title}
                </h3>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={() => setViewEval(null)}
              >
                ×
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600 mt-2">
              <span>
                Evaluador: <strong>{viewEval.evaluatorName}</strong>
              </span>
              <span>·</span>
              <span>
                Empleado: <strong>{viewEval.employeeName || "General"}</strong>
              </span>
              <span>·</span>
              <span>
                Estado: {viewEval.status === "completed" ? "Completada" : "Pendiente"}
              </span>
              {viewEval.notes && (
                <>
                  <span>·</span>
                  <span>Notas: {viewEval.notes}</span>
                </>
              )}
            </div>

            {loadingDetail ? (
              <p className="text-sm text-slate-600 mt-3">Cargando respuestas...</p>
            ) : viewEval.checklist ? (
              <div className="mt-4 space-y-3">
                {viewEval.checklist.description ? (
                  <p className="text-[12px] text-slate-600">
                    {viewEval.checklist.description}
                  </p>
                ) : null}
                <ReadOnlyTree
                  items={viewEval.checklist.items || []}
                  responses={viewEval.responses || []}
                  ratingLabel={ratingLabel}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
