import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import EvaluationsClient from "./EvaluationsClient";

export default async function EvaluationsPage() {
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

  if (payload.role !== "admin" && payload.role !== "evaluator") {
    if (payload.role === "employee") {
      redirect("/employee");
    }
    redirect("/admin");
  }

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="card p-6 text-sm text-slate-600">
            Cargando evaluaciones...
          </div>
        }
      >
        <EvaluationsClient role={payload.role} userName={payload.name || "Usuario"} />
      </Suspense>
    </div>
  );
}
