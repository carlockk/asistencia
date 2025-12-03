import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

function parseDateParam(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

export async function GET(req, { params }) {
  try {
    await connectDB();

    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json(
        { message: "Solo admin puede ver este detalle" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromParam = parseDateParam(searchParams.get("from"));
    const toParam = parseDateParam(searchParams.get("to"));

    const filter = { user: params.id };
    if (fromParam || toParam) {
      filter.date = {};
      if (fromParam) filter.date.$gte = fromParam;
      if (toParam) filter.date.$lte = toParam;
    }

    const records = await Attendance.find(filter).sort({ date: 1 });

    const user = await User.findById(params.id);

    return NextResponse.json({
      employee: user
        ? {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            hourlyRate: user.hourlyRate
          }
        : null,
      records: records.map((r) => ({
        id: r._id.toString(),
        date: r.date,
        entryTime: r.entryTime,
        exitTime: r.exitTime,
        minutesWorked: r.minutesWorked
      }))
    });
  } catch (err) {
    console.error("GET /api/attendance/by-employee/[id]", err);
    return NextResponse.json(
      { message: "Error obteniendo asistencia" },
      { status: 500 }
    );
  }
}
