import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export const runtime = "nodejs";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("admin")) throw new Error("FORBIDDEN");
  return payload;
}

function parseYMD(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function safeISO(date) {
  if (!date) return "";
  try {
    return new Date(date).toISOString();
  } catch {
    return "";
  }
}

export async function GET(req) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const from = parseYMD(searchParams.get("from"));
    const to = parseYMD(searchParams.get("to"));

    const filter = {};
    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    } else if (from) {
      filter.date = { $gte: from };
    } else if (to) {
      filter.date = { $lte: to };
    }

    const records = await Attendance.find(filter)
      .populate("user", "firstName lastName username")
      .sort({ date: 1 });

    const header = [
      "Empleado",
      "Usuario",
      "Fecha",
      "Entrada (ISO)",
      "Salida (ISO)",
      "Minutos trabajados"
    ];

    const rows = records.map((r) => {
      const userName = r.user
        ? `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() ||
          r.user.username
        : "";
      return [
        `"${userName.replace(/"/g, '""')}"`,
        `"${(r.user?.username || "").replace(/"/g, '""')}"`,
        r.date || "",
        safeISO(r.entryTime),
        safeISO(r.exitTime),
        r.minutesWorked ?? ""
      ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="asistencia.csv"'
      }
    });
  } catch (err) {
    console.error("GET /api/attendance/export", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error exportando asistencia" },
      { status: 500 }
    );
  }
}
