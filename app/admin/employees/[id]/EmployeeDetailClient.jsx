"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../../components/TopBar";

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
  let remaining = Math.round((totalMinutes - hours * 60) * 100) / 100;
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

export default function EmployeeDetailClient({ employeeId }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(
        `/api/attendance/by-employee/${employeeId}?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando detalle");
      setEmployee(data.employee);
      setRecords(data.records || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => computeTotals(records, employee?.hourlyRate || 0),
    [records, employee]
  );

  function handleBack() {
    router.push("/admin");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const employeeName =
    employee?.firstName || employee?.lastName
      ? `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim()
      : employee?.username || "Empleado";

  return (
    <div className="space-y-4">
      <TopBar
        userName={employeeName}
        subtitle="Detalle de empleado"
        actions={
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center text-[11px] text-slate-600">
            <button
              className="btn-secondary text-xs px-3 py-1.5 text-left"
              type="button"
              onClick={() => router.push("/admin/vacations")}
            >
              Vacaciones
            </button>
            <button
              className="btn-secondary text-xs px-3 py-1.5 text-left"
              type="button"
              onClick={handleBack}
            >
              Volver
            </button>
          </div>
        }
        onLogout={handleLogout}
      />

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 mb-1">Seguimiento</p>
            <h2 className="text-lg font-semibold text-slate-800">
              {employeeName}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.3fr,1fr] gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Desde</label>
                <input
                  type="date"
                  className="input text-xs"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input
                  type="date"
                  className="input text-xs"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <button
                className="btn-primary text-xs mt-2"
                type="button"
                onClick={load}
              >
                Filtrar
              </button>
            </div>

            {error && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
                {error}
              </p>
            )}

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
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-slate-400"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-slate-400"
                      >
                        No hay registros para el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
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
                {totals.hoursLabel}
              </h3>
              <p className="text-xs text-slate-700">
                Total minutos: {formatMinutes(totals.totalMinutes)} min
              </p>
            </div>
            <div className="mt-4 space-y-1 text-xs">
              <p className="flex justify-between">
                <span>Valor hora:</span>
                <span className="font-semibold">
                  {employee?.hourlyRate
                    ? `$${employee.hourlyRate.toLocaleString("es-CL")}`
                    : "-"}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Monto a pagar:</span>
                <span className="font-semibold text-banco-rojo">
                  {employee?.hourlyRate
                    ? `$${totals.amount.toLocaleString("es-CL", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}`
                    : "-"}
                </span>
              </p>
              <p className="text-[11px] text-slate-700 mt-2">
                Filtra por fechas para calcular al instante las horas trabajadas
                y el monto estimado a pagar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
