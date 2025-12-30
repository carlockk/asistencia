"use client";

export default function RoleNav({ roles = [], onNavigate, active = "" }) {
  const list = Array.isArray(roles) ? roles : [roles];
  const showEmployeeNav = list.includes("employee") || list.includes("evaluator");
  const showEvaluator = list.includes("evaluator");

  const items = [
    {
      label: "Inicio",
      path: "/employee",
      show: showEmployeeNav
    },
    {
      label: "Mi perfil",
      path: "/employee/profile",
      show: showEmployeeNav
    },
    {
      label: "Vacaciones",
      path: "/employee/vacations",
      show: showEmployeeNav
    },
    {
      label: "Evaluaciones",
      path: "/evaluations",
      show: showEvaluator
    }
  ].filter((item) => item.show);

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item) => (
        <button
          key={item.path}
          className={`btn-secondary text-xs px-3 py-1.5 ${
            active === item.path ? "bg-slate-800 text-white border-slate-800" : ""
          }`}
          type="button"
          onClick={() => onNavigate?.(item.path)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
