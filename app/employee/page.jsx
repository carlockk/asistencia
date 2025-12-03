import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import EmployeeDashboardClient from "./EmployeeDashboardClient";

export default async function EmployeePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    redirect("/");
  }
  if (payload.role !== "employee") {
    redirect("/admin");
  }

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="card p-6 text-sm text-slate-600">
            Cargando panel de empleado...
          </div>
        }
      >
        <EmployeeDashboardClient employeeName={payload.name || "Empleado"} />
      </Suspense>
    </div>
  );
}
