import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import VacationsClient from "./VacationsClient";

export default async function VacationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    redirect("/");
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    redirect("/");
  }
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("admin")) {
    if (roles.includes("evaluator")) {
      redirect("/evaluations");
    }
    redirect("/employee");
  }

  return (
    <Suspense
      fallback={
        <div className="card p-6 text-sm text-slate-600">
          Cargando vacaciones...
        </div>
      }
    >
      <VacationsClient adminName={payload.name || "Admin"} />
    </Suspense>
  );
}
