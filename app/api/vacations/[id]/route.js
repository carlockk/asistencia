import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Vacation from "@/models/Vacation";
import User from "@/models/User";
import { sendMail } from "@/lib/mailer";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("admin")) throw new Error("FORBIDDEN");
  return payload;
}

const ALLOWED_STATUS = ["pending", "approved", "rejected"];

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

async function hasOverlap(userId, startDate, endDate, excludeId = null) {
  const filter = {
    user: userId,
    status: { $ne: "rejected" },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const existing = await Vacation.findOne(filter);
  return Boolean(existing);
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    await requireAdmin();

    const body = await req.json();
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const userId = body.userId;
    const status = ALLOWED_STATUS.includes(body.status) ? body.status : "pending";
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

    const userDoc = await User.findById(userId).select("email firstName lastName username");
    if (!userDoc) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 400 }
      );
    }

    if (await hasOverlap(userId, startDate, endDate, params.id)) {
      return NextResponse.json(
        { message: "El rango se superpone con vacaciones existentes" },
        { status: 400 }
      );
    }

    const updated = await Vacation.findByIdAndUpdate(
      params.id,
      {
        user: userId,
        startDate,
        endDate,
        status,
        note
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Vacacion no encontrada" },
        { status: 404 }
      );
    }

    if (userDoc.email) {
      const subject = "Estado de vacaciones actualizado";
      const body = `Tus vacaciones del ${startDate} al ${endDate} fueron marcadas como ${status}.`;
      sendMail({
        to: userDoc.email,
        subject,
        text: `${body}${note ? ` Nota: ${note}` : ""}`
      }).catch(() => {});
    }

    return NextResponse.json({
      vacation: {
        id: updated._id.toString(),
        userId,
        startDate,
        endDate,
        status,
        note
      }
    });
  } catch (err) {
    console.error("PUT /api/vacations/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error actualizando vacaciones" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    await requireAdmin();

    const deleted = await Vacation.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Vacacion no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/vacations/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error eliminando vacaciones" },
      { status: 500 }
    );
  }
}
