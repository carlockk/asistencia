import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
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
    if (roles.includes("evaluator")) redirect("/evaluations");
    redirect("/");
  }

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="card p-6 text-sm text-slate-600">
            Cargando perfil...
          </div>
        }
      >
        <ProfileClient />
      </Suspense>
    </div>
  );
}
