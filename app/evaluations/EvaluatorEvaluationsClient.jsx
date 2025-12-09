"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import { ratingOptions, collectCheckableIds } from "./utils";
import { useAvatar } from "./useAvatar";

export default function EvaluatorEvaluationsClient({ evaluatorName }) {
  const router = useRouter();
  const avatarUrl = useAvatar();
  const pageSize = 10;

  const [evaluations, setEvaluations] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [activeEval, setActiveEval] = useState(null);
  const [responseMap, setResponseMap] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadEvaluations(p = page) {
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluations?page=${p}&pageSize=${pageSize}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando evaluaciones");
      setEvaluations(data.evaluations || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function openEvaluation(id) {
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/evaluations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando checklist");
      setActiveEval(data.evaluation);
      setNotes(data.evaluation?.notes || "");
      const map = {};
      (data.evaluation?.responses || []).forEach((r) => {
        map[r.itemId] = r.value;
      });
      setResponseMap(map);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  function setResponse(itemId, value) {
    setResponseMap((prev) => ({ ...prev, [itemId]: value }));
  }

  function ensureAllAnswered(items) {
    const ids = collectCheckableIds(items, []);
    return ids.every((id) => responseMap[id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeEval?.id || !activeEval?.checklist?.items) return;
    if (!ensureAllAnswered(activeEval.checklist.items)) {
      setError("Completa todas las preguntas antes de enviar.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const responses = Object.entries(responseMap).map(([itemId, value]) => ({
        itemId,
        value
      }));
      const res = await fetch(`/api/evaluations/${activeEval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error enviando evaluacion");
      setMessage("Evaluacion enviada. Volvemos al listado.");
      setActiveEval(null);
      setResponseMap({});
      setNotes("");
      loadEvaluations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function renderChecklist(items, level = 0) {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-slate-100 rounded-xl bg-white/70 p-3"
            style={{ marginLeft: level * 18 }}
          >
            <p className="text-sm font-semibold text-slate-800 mb-2">{item.title}</p>
            {item.hasCheck === false ? (
              <p className="text-[11px] text-slate-500 mb-1">Solo título, sin check.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ratingOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`px-3 py-1 rounded-full border text-[12px] cursor-pointer ${
                      responseMap[item.id] === opt.value
                        ? "bg-banco-rojo text-white border-banco-rojo"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`resp-${item.id}`}
                      value={opt.value}
                      className="hidden"
                      checked={responseMap[item.id] === opt.value}
                      onChange={() => setResponse(item.id, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
            {item.children?.length ? (
              <div className="mt-2">{renderChecklist(item.children, level + 1)}</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TopBar
        userName={evaluatorName}
        subtitle="Evaluador"
        avatarUrl={avatarUrl}
        actions={<span className="text-[11px] text-slate-600">Mis evaluaciones</span>}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
        }}
      />

      {message && (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
          {message}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
          {error}
        </p>
      )}

      {activeEval && activeEval.checklist ? (
        <form className="card p-5 md:p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-500">Checklist asignado</p>
              <h2 className="text-lg font-semibold text-slate-800">
                {activeEval.checklist.title}
              </h2>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActiveEval(null)}
            >
              Volver al listado
            </button>
          </div>
          {activeEval.checklist.description ? (
            <p className="text-[12px] text-slate-600">
              {activeEval.checklist.description}
            </p>
          ) : null}

          {renderChecklist(activeEval.checklist.items || [])}

          <div>
            <label className="label">Notas</label>
            <textarea
              className="input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones generales"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Enviando..." : "Enviar evaluacion"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card p-5 md:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-slate-500">Listado</p>
            <h2 className="text-lg font-semibold text-slate-800">
              Mis evaluaciones ({total})
            </h2>
          </div>
        </div>

        <div className="overflow-auto border border-slate-100 rounded-2xl bg-white/70">
          <table className="min-w-full text-xs">
            <thead className="bg-pastel-celeste/60">
              <tr className="text-[11px] text-slate-600">
                <th className="px-3 py-2 text-left">Checklist</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Creada</th>
                <th className="px-3 py-2 text-left">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                    No tienes evaluaciones asignadas.
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
                    <td className="px-3 py-2 text-[11px]">
                      {ev.status === "completed" ? (
                        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                          Enviada
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
                    <td className="px-3 py-2 text-[11px]">
                      <button
                        type="button"
                        className="text-slate-700 underline decoration-banco-rojo decoration-2 underline-offset-4"
                        onClick={() => openEvaluation(ev.id)}
                      >
                        {ev.status === "completed" ? "Ver" : "Completar"}
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
            Pagina {page} de {totalPages}
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
    </div>
  );
}
