import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import User from "@/models/User";

export const runtime = "nodejs";

async function requireAuthAllowed() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("admin") && !roles.includes("evaluator")) {
    throw new Error("FORBIDDEN");
  }
  return payload;
}

export async function GET() {
  try {
    await connectDB();
    await requireAuthAllowed();

    const employees = await User.find({
      $or: [{ role: "employee" }, { roles: "employee" }]
    })
      .sort({ firstName: 1, lastName: 1 })
      .select("firstName lastName username");

    return NextResponse.json({
      employees: employees.map((u) => ({
        id: u._id.toString(),
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
      }))
    });
  } catch (err) {
    console.error("GET /api/employees", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo empleados" },
      { status: 500 }
    );
  }
}
