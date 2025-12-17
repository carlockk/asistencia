import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import VacationsEmployeeClient from "./VacationsEmployeeClient";

export default async function EmployeeVacationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    redirect("/");
  }
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("employee")) {
    if (roles.includes("admin")) redirect("/admin");
    return redirect("/evaluations");
  }

  return (
    <Suspense
      fallback={
        <div className="card p-6 text-sm text-slate-600">
          Cargando vacaciones...
        </div>
      }
    >
      <VacationsEmployeeClient employeeName={payload.name || "Empleado"} />
    </Suspense>
  );
}
