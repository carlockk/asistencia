import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Vacation from "@/models/Vacation";
import User from "@/models/User";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  if (payload.role !== "admin") throw new Error("FORBIDDEN");
  return payload;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

async function hasOverlap(userId, startDate, endDate, excludeId = null) {
  const filter = {
    user: userId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const existing = await Vacation.findOne(filter);
  return Boolean(existing);
}

export async function GET(req) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const filter = {};
    if (userId) filter.user = userId;

    const vacations = await Vacation.find(filter)
      .populate("user", "firstName lastName username")
      .sort({ startDate: 1 });

    return NextResponse.json({
      vacations: vacations.map((v) => ({
        id: v._id.toString(),
        userId: v.user?._id?.toString() || v.user?.toString(),
        userName: v.user
          ? `${v.user.firstName || ""} ${v.user.lastName || ""}`.trim() ||
            v.user.username
          : "Empleado",
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
        note: v.note || ""
      }))
    });
  } catch (err) {
    console.error("GET /api/vacations", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo vacaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    await requireAdmin();

    const body = await req.json();
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const userId = body.userId;
    const status = body.status === "pending" ? "pending" : "approved";
    const note = body.note || "";

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Usuario, fecha inicio y fecha fin son obligatorios" },
        { status: 400 }
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { message: "La fecha de inicio no puede ser mayor que la de fin" },
        { status: 400 }
      );
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 400 }
      );
    }

    if (await hasOverlap(userId, startDate, endDate)) {
      return NextResponse.json(
        { message: "El rango se superpone con vacaciones existentes" },
        { status: 400 }
      );
    }

    const vacation = await Vacation.create({
      user: userId,
      startDate,
      endDate,
      status,
      note
    });

    return NextResponse.json(
      {
        vacation: {
          id: vacation._id.toString(),
          userId,
          startDate,
          endDate,
          status,
          note
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/vacations", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando vacaciones" },
      { status: 500 }
    );
  }
}
