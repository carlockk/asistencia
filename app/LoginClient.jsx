"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginClient() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al iniciar sesión");

      const roles = Array.isArray(data.user?.roles)
        ? data.user.roles
        : [data.user?.role];
      if (roles.includes("admin")) {
        router.push("/admin");
      } else if (roles.includes("employee") && roles.includes("evaluator")) {
        router.push("/employee");
      } else if (roles.includes("evaluator")) {
        router.push("/evaluations");
      } else {
        router.push("/employee");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo + nombre sistema */}
      <div className="flex flex-col items-center mb-2">
        <Image
          src="/asistencia.png"
          alt="Logo Asiste"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          priority
        />
        <span className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
          Asiste · Sistema de asistencia
        </span>
      </div>

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
            Acceso al sistema
          </span>
          <h2 className="text-[24px] md:text-[26px] font-bold text-slate-800 tracking-tight">
            Bienvenido 👋
          </h2>
          <p className="text-[13px] text-slate-500 leading-snug max-w-xs">
            Ingresa tus credenciales para marcar asistencia o gestionar al
            equipo.
          </p>
        </div>

        {/* Mini “pestañas” de roles */}
        <div className="hidden md:flex flex-col text-right text-[11px] text-slate-500 leading-tight">
          <span className="font-semibold text-slate-700 mb-1">
            Roles disponibles
          </span>
          <div className="inline-flex rounded-full bg-slate-100 p-1 gap-1">
            <span className="px-2 py-1 rounded-full bg-white text-slate-700 border border-slate-200">
              Admin
            </span>
            <span className="px-2 py-1 rounded-full text-slate-500">
              Empleado
            </span>
            <span className="px-2 py-1 rounded-full text-slate-500">
              Evaluador
            </span>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="label">Usuario</label>
          <input
            className="input h-11"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="ej: carlos"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Contraseña</label>
          <input
            type="password"
            className="input h-11"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          <p className="text-[11px] text-slate-500 pt-1">
            El sistema detectará si eres admin o empleado según tu usuario.
          </p>
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Entrar ahora"}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            ¿Problemas para entrar? Contacta a un administrador para restablecer
            tu acceso.
          </p>
        </div>
      </form>
    </div>
  );
}
