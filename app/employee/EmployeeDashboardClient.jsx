"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import RoleNav from "../components/RoleNav";

function useClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function EmployeeDashboardClient({ employeeName, roles = [] }) {
  const router = useRouter();
  const now = useClock();
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    async function loadAvatar() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          if (data.user.avatarUrl) setAvatarUrl(data.user.avatarUrl);
        }
      } catch {
        // ignorar errores de avatar
      }
    }
    loadAvatar();
  }, []);

  async function mark(type) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (!res.ok) {
        setType("error");
        setMessage(data.message || "Error al marcar");
      } else {
        setType("success");
        setMessage(data.message || "Marcacion realizada");
      }
    } catch (err) {
      setType("error");
      setMessage("Error de red al marcar");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="w-full">
      <TopBar
        userName={employeeName}
        subtitle="Panel empleado"
        avatarUrl={avatarUrl}
        actions={
          <RoleNav roles={roles} active="/employee" onNavigate={router.push} />
        }
        onLogout={handleLogout}
      />

      <div className="space-y-4 px-4 pb-4">
        <div className="card p-5 md:p-7 space-y-5">
          <div className="rounded-3xl bg-gradient-to-br from-pastel-celeste via-pastel-menta to-pastel-rosa p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-soft border border-white/60">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/80 text-slate-700 shadow-sm">
                  Marcador diario
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-emerald-700 border border-emerald-200">
                  En linea
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
                {now
                  ? now.toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })
                  : "--:--:--"}
              </div>
              <p className="text-xs text-slate-700 mt-1">
                {now
                  ? now.toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })
                  : "Cargando fecha..."}
              </p>
              <p className="text-[11px] text-slate-700 mt-3 max-w-xl">
                Marca tus entradas y salidas en tiempo real. Recuerda mantener la pagina abierta mientras se procesa.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[210px]">
              <button
                className="btn-success w-full md:w-52 shadow"
                disabled={loading}
                onClick={() => mark("entry")}
              >
                Marcar entrada
              </button>
              <button
                className="btn-danger w-full md:w-52 shadow"
                disabled={loading}
                onClick={() => mark("exit")}
              >
                Marcar salida
              </button>
              <div className="text-[11px] text-slate-700 bg-white/70 border border-white/60 rounded-xl px-3 py-2 shadow-sm">
                <p className="font-semibold">Estado</p>
                <p className="text-slate-600">
                  {loading ? "Procesando marcacion..." : "Listo para marcar"}
                </p>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`text-[11px] px-3 py-2 rounded-2xl border ${
                type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : type === "error"
                  ? "bg-rose-50 border-rose-100 text-rose-700"
                  : "bg-slate-50 border-slate-100 text-slate-700"
              }`}
            >
              {message}
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Para evitar errores, el sistema limita a 3 intentos por tipo de
            marcacion dentro de 30 minutos. Siempre se guardara el primer
            registro de entrada y salida del dia.
          </p>
        </div>
      </div>
    </div>
  );
}
