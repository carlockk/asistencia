"use client";

import { Children, useMemo, useState, isValidElement } from "react";
import Image from "next/image";

function AvatarMini({ name, avatarUrl, size = "sm" }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const sizeClasses =
    size === "lg" ? "h-11 w-11 text-base" : "h-7 w-7 text-xs";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        className={`${sizeClasses} rounded-full object-cover border border-white/70 shadow-sm`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={`${sizeClasses} rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center border border-white/70 shadow-sm`}
    >
      {initial}
    </span>
  );
}

export default function TopBar({
  userName,
  subtitle,
  onLogout,
  actions = null,
  avatarUrl = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileActions = useMemo(() => {
    let list = [];
    if (Array.isArray(actions)) list = Children.toArray(actions);
    else if (isValidElement(actions) && actions.props?.children) {
      list = Children.toArray(actions.props.children);
    } else if (actions) {
      list = [actions];
    }
    // filtramos elementos vacíos para evitar “botones” fantasma
    return list.filter(Boolean);
  }, [actions]);

  async function handleLogout() {
    if (!onLogout) return;
    await Promise.resolve(onLogout());
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 w-full mb-4">
      <div className="bg-white/80 backdrop-blur-md border-b border-white/60 shadow-soft px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/asistencia.png"
            alt="Logo asistencia"
            width={40}
            height={40}
            className="h-10 w-10 rounded-2xl shadow-soft object-contain flex-shrink-0"
            priority
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm sm:text-base font-semibold text-slate-800">
              Asistencia de empleados
            </span>
            <span className="text-[11px] text-slate-500">
              Control de jornada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:justify-end">
          {/* Info usuario en desktop */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-start min-w-0">
            {subtitle && (
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {subtitle}
              </span>
            )}
            <span className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800 truncate">
              <AvatarMini name={userName} avatarUrl={avatarUrl} />
              <span className="truncate">Bienvenido, {userName}</span>
            </span>
          </div>

          {/* Acciones desktop */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end min-w-0 text-[13px]">
            <div className="flex items-center gap-2">{actions}</div>
            {onLogout && (
              <button
                className="text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 px-3.5 py-1.5 rounded-lg"
                type="button"
                onClick={handleLogout}
              >
                Cerrar sesion
              </button>
            )}
          </div>

          {/* Botón menú móvil */}
          <div className="flex items-center gap-2 min-w-0 sm:hidden ml-auto">
            <button
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              &#9776;
            </button>
          </div>
        </div>
      </div>

      {/* Menú deslizante móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="absolute top-0 right-0 h-full w-72 max-w-[80%] bg-white shadow-xl border-l border-slate-100 p-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Menu</span>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menu"
              >
                &times;
              </button>
            </div>

            {/* Usuario (avatar grande + bienvenida) */}
            <div className="flex items-center gap-3 text-base font-semibold text-slate-800 mt-1">
              <AvatarMini name={userName} avatarUrl={avatarUrl} size="lg" />
              <span className="truncate">Bienvenido, {userName}</span>
            </div>

            {/* Subtítulo / rol */}
            <div className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-500">
              {subtitle}
            </div>

            {/* Acciones de navegación */}
            <div className="flex flex-col text-sm text-slate-700 flex-1">
              <div className="-mx-4">
                {mobileActions.map((item, idx) => (
                  <div key={idx} className="mobile-menu-item">
                    {item}
                  </div>
                ))}
              </div>

            {/* Cerrar sesión full ancho */}
              <div className="mt-auto -mx-4">
                {onLogout && (
                  <button
                    type="button"
                    className="w-full text-left text-rose-600 font-semibold bg-rose-50 border-t border-rose-100 px-4 py-3 mobile-menu-logout"
                    onClick={handleLogout}
                  >
                    Cerrar sesion
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
