import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Vacation from "@/models/Vacation";
import User from "@/models/User";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

async function requireEmployee() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("employee")) throw new Error("FORBIDDEN");
  return payload;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

async function hasOverlap(userId, startDate, endDate) {
  const existing = await Vacation.findOne({
    user: userId,
    status: { $ne: "rejected" },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  });
  return Boolean(existing);
}

export async function GET() {
  try {
    await connectDB();
    const payload = await requireEmployee();
    const vacations = await Vacation.find({ user: payload.id })
      .sort({ startDate: -1 })
      .limit(100);

    return NextResponse.json({
      vacations: vacations.map((v) => ({
        id: v._id.toString(),
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
        note: v.note || ""
      }))
    });
  } catch (err) {
    console.error("GET /api/vacations/my", err);
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
    const payload = await requireEmployee();

    const body = await req.json();
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const note = (body.note || "").toString().trim();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "Fecha inicio y fecha fin son obligatorias" },
        { status: 400 }
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { message: "La fecha de inicio no puede ser mayor que la de fin" },
        { status: 400 }
      );
    }

    const userDoc = await User.findById(payload.id).select("email firstName lastName username");
    if (!userDoc) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 400 }
      );
    }

    if (await hasOverlap(payload.id, startDate, endDate)) {
      return NextResponse.json(
        { message: "El rango se superpone con vacaciones existentes" },
        { status: 400 }
      );
    }

    const vacation = await Vacation.create({
      user: payload.id,
      startDate,
      endDate,
      status: "pending",
      note
    });

    // Notificar al solicitante
    if (userDoc.email) {
      const subject = "Solicitud de vacaciones enviada";
      const body = `Recibimos tu solicitud de vacaciones del ${startDate} al ${endDate}. Estado: pendiente.`;
      sendMail({
        to: userDoc.email,
        subject,
        text: `${body}${note ? ` Nota: ${note}` : ""}`
      }).catch(() => {});
    }

    // Notificar a administradores si hay lista de alertas
    const adminList =
      process.env.ADMIN_ALERT_EMAILS?.split(",")
        .map((e) => e.trim())
        .filter(Boolean) || [];
    if (adminList.length > 0) {
      const subject = "Nueva solicitud de vacaciones";
      const body = `El empleado ${userDoc.firstName || userDoc.username} solicitó vacaciones del ${startDate} al ${endDate}. Estado: pendiente.${note ? ` Nota: ${note}` : ""}`;
      adminList.forEach((addr) => {
        sendMail({
          to: addr,
          subject,
          text: body
        }).catch(() => {});
      });
    }

    return NextResponse.json(
      {
        vacation: {
          id: vacation._id.toString(),
          startDate,
          endDate,
          status: vacation.status,
          note
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/vacations/my", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando solicitud" },
      { status: 500 }
    );
  }
}
