import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import EmployeeDetailClient from "./EmployeeDetailClient";

export default function EmployeeDetailPage({ params }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    redirect("/");
  }
  if (payload.role !== "admin") {
    redirect("/employee");
  }

  return (
    <div className="w-full px-4">
      <Suspense
        fallback={
          <div className="card p-6 text-sm text-slate-600">
            Cargando detalle de empleado...
          </div>
        }
      >
        <EmployeeDetailClient employeeId={params.id} />
      </Suspense>
    </div>
  );
}
