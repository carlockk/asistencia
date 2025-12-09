import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Attendance from "@/models/Attendance";

function diffMinutes(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const payload = verifyToken(token);
    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (roles.includes("admin") || !roles.includes("employee")) {
      return NextResponse.json(
        { message: "Solo empleados pueden marcar asistencia" },
        { status: 403 }
      );
    }

    const { type } = await req.json();
    if (!["entry", "exit"].includes(type)) {
      return NextResponse.json(
        { message: "Tipo de marcación inválido" },
        { status: 400 }
      );
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let attendance = await Attendance.findOne({
      user: payload.id,
      date: todayStr
    });

    if (!attendance) {
      attendance = new Attendance({
        user: payload.id,
        date: todayStr
      });
    }

    if (type === "entry") {
      const last = attendance.lastEntryAttemptAt || new Date(0);
      const minutesSinceLast = diffMinutes(now, last);

      if (minutesSinceLast < 30 && attendance.entryAttempts >= 3) {
        return NextResponse.json(
          {
            message:
              "Has intentado marcar entrada demasiadas veces. Espera 30 minutos para volver a intentarlo."
          },
          { status: 429 }
        );
      }

      attendance.entryAttempts = (attendance.entryAttempts || 0) + 1;
      attendance.lastEntryAttemptAt = now;

      let message;
      if (!attendance.entryTime) {
        attendance.entryTime = now;
        message = "Entrada marcada correctamente. ¡Buen día! 🌞";
      } else {
        message =
          "Ya habías marcado tu entrada antes. Se mantendrá el primer registro.";
      }

      await attendance.save();
      return NextResponse.json({ message });
    }

    if (type === "exit") {
      if (!attendance.entryTime) {
        return NextResponse.json(
          { message: "Primero debes marcar tu entrada." },
          { status: 400 }
        );
      }

      const last = attendance.lastExitAttemptAt || new Date(0);
      const minutesSinceLast = diffMinutes(now, last);

      if (minutesSinceLast < 30 && attendance.exitAttempts >= 3) {
        return NextResponse.json(
          {
            message:
              "Has intentado marcar salida demasiadas veces. Espera 30 minutos para volver a intentarlo."
          },
          { status: 429 }
        );
      }

      attendance.exitAttempts = (attendance.exitAttempts || 0) + 1;
      attendance.lastExitAttemptAt = now;

      let message;
      if (!attendance.exitTime) {
        attendance.exitTime = now;
        const minutesWorked = diffMinutes(attendance.entryTime, now);
        attendance.minutesWorked = Math.round(minutesWorked * 100) / 100;
        message = "Salida marcada correctamente. ¡Buen descanso! 🌙";
      } else {
        message =
          "Ya habías marcado tu salida antes. Se mantendrá el primer registro.";
      }

      await attendance.save();
      return NextResponse.json({ message });
    }
  } catch (err) {
    console.error("POST /api/attendance/mark", err);
    return NextResponse.json(
      { message: "Error marcando asistencia" },
      { status: 500 }
    );
  }
}
