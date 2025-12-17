"use client";

export default function AdminNav({ active = "", onNavigate }) {
  const items = [
    { label: "Documentos", path: "/admin/documents" },
    { label: "Evaluaciones", path: "/evaluations" },
    { label: "Usuarios", path: "/admin" },
    { label: "Vacaciones", path: "/admin/vacations" }
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[11px] text-slate-600">
      {items.map((item) => {
        const isActive = active === item.path || active === item.label.toLowerCase();
        if (isActive) {
          return (
            <span
              key={item.path}
              className="font-semibold text-slate-800 sm:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4"
              aria-current="page"
            >
              {item.label}
            </span>
          );
        }
        return (
          <button
            key={item.path}
            type="button"
            className="text-slate-500 hover:text-slate-800 sm:hover:underline sm:decoration-banco-rojo sm:decoration-2 sm:underline-offset-4 px-0 text-left"
            onClick={() => onNavigate?.(item.path)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
