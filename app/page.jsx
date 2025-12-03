import { Suspense } from "react";
import LoginClient from "./LoginClient";
import HeroClock from "./components/HeroClock";

export default function HomePage() {
  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=2000&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Capa de oscurecimiento para el texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/50 to-slate-900/20"></div>

      {/* TEXTO DEL HERO AL LADO IZQUIERDO */}
      <div className="relative z-10 h-full flex flex-col justify-center pl-10 md:pl-16 max-w-2xl text-white gap-6 py-20">
        {/* Badges superiores */}
        <div className="space-y-2 text-[11px]">
          <div className="inline-flex px-3 py-1 rounded-full font-semibold bg-white/15 backdrop-blur-sm border border-white/20">
            Control horario en tiempo real
          </div>
          <div className="inline-flex px-3 py-1 rounded-full font-semibold bg-black/35 text-white/80 border border-white/25 backdrop-blur-sm">
            Asiste · Sistema de asistencia
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
          Controla la asistencia <span className="text-banco-rojo">de tu equipo</span>
        </h1>

        {/* Descripción */}
        <p className="text-sm md:text-[15px] text-slate-100/90 max-w-xl">
          Marca de entrada y salida, panel administrativo, perfiles por rol y registros listos para exportar cuando los necesites.
        </p>

      {/* Badge de sistema escalable */}
      <div>
        <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-100/90 text-violet-800">
          Sistema escalable
        </span>
      </div>

      {/* Reloj decorativo */}
      <HeroClock />
    </div>

      {/* LOGIN PANEL A LA DERECHA */}
      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white/85 backdrop-blur border-l border-white/60 shadow-xl flex items-start justify-center px-6 md:px-10">
        <Suspense fallback={<div className="text-sm text-slate-600">Cargando...</div>}>
          <div className="w-full max-w-md mt-10">
            <LoginClient />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
