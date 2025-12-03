import { Suspense } from "react";
import LoginClient from "./LoginClient";
import HeroClock from "./components/HeroClock";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full relative bg-white md:bg-transparent">
      {/* Fondo y overlay solo en desktop */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=2000&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-slate-900/70 via-slate-900/50 to-slate-900/20"></div>

      <div className="relative z-10 min-h-screen">
        {/* Hero solo desktop */}
        <div className="hidden md:flex flex-col justify-center pl-10 md:pl-16 max-w-2xl text-white gap-6 py-20">
          <div className="space-y-2 text-[11px]">
            <div className="inline-flex px-3 py-1 rounded-full font-semibold bg-white/15 backdrop-blur-sm border border-white/20">
              Control horario en tiempo real
            </div>
            <div className="inline-flex px-3 py-1 rounded-full font-semibold bg-black/35 text-white/80 border border-white/25 backdrop-blur-sm">
              Asiste ú Sistema de asistencia
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
            Controla la asistencia <span className="text-banco-rojo">de tu equipo</span>
          </h1>

          <p className="text-sm md:text-[15px] text-slate-100/90 max-w-xl">
            Marca de entrada y salida, panel administrativo, perfiles por rol y registros listos para exportar cuando los necesites.
          </p>

          <div>
            <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-100/90 text-violet-800">
              Sistema escalable
            </span>
          </div>

          <HeroClock />
        </div>

        {/* Login: en móvil ocupa ancho completo; en desktop se superpone delgado a la derecha */}
        <div className="flex justify-center md:block">
          <div className="w-full max-w-md bg-white shadow-xl px-4 sm:px-6 py-10 relative md:absolute md:top-0 md:right-0 md:h-full md:bg-white/85 md:backdrop-blur md:border-l md:border-white/60 md:px-10 md:flex md:items-start md:justify-center">
            <Suspense fallback={<div className="text-sm text-slate-600">Cargando...</div>}>
              <div className="w-full max-w-md mt-8 md:mt-10">
                <LoginClient />
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
