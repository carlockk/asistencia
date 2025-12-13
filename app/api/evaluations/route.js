import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Evaluation from "@/models/Evaluation";
import Checklist from "@/models/Checklist";
import User from "@/models/User";

export const runtime = "nodejs";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  return verifyToken(token);
}

function formatUserName(user) {
  if (!user) return "Usuario";
  const first = user.firstName || "";
  const last = user.lastName || "";
  const name = `${first} ${last}`.trim();
  return name || user.username || "Usuario";
}

function normalizeEvaluation(ev) {
  return {
    id: ev._id.toString(),
    checklistId:
      ev.checklist?._id?.toString() ||
      (typeof ev.checklist === "string" ? ev.checklist : ev.checklist?.toString?.()),
    checklistTitle: ev.checklist?.title || "Checklist",
    evaluatorId:
      ev.assignedTo?._id?.toString() ||
      (typeof ev.assignedTo === "string" ? ev.assignedTo : ev.assignedTo?.toString?.()),
    evaluatorName: formatUserName(ev.assignedTo),
    status: ev.status,
    submittedAt: ev.submittedAt,
    createdAt: ev.createdAt,
    notes: ev.notes || ""
  };
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (!roles.includes("admin") && !roles.includes("evaluator")) {
      throw new Error("FORBIDDEN");
    }
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("pageSize") || "10", 10))
    );
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const filter = roles.includes("admin") ? {} : { assignedTo: payload.id };

    let evaluations = await Evaluation.find(filter)
      .sort({ createdAt: -1 })
      .populate("checklist", "title")
      .populate("assignedTo", "firstName lastName username role");

    evaluations = evaluations.filter((ev) => {
      if (from || to) {
        const created = ev.createdAt ? new Date(ev.createdAt) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to && created > endOfDay(to)) return false;
      }
      if (q) {
        const text = `${ev.checklist?.title || ""} ${formatUserName(ev.assignedTo)} ${
          ev.notes || ""
        }`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const total = evaluations.length;
    const paged = evaluations.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      evaluations: paged.map(normalizeEvaluation),
      page,
      pageSize,
      total
    });
  } catch (err) {
    console.error("GET /api/evaluations", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo evaluaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (!roles.includes("admin")) throw new Error("FORBIDDEN");

    const body = await req.json();
    const checklistId = body.checklistId;
    const evaluatorIds = Array.isArray(body.evaluatorIds)
      ? body.evaluatorIds.filter(Boolean)
      : [];
    const notes = (body.notes || "").trim();

    if (!checklistId || evaluatorIds.length === 0) {
      return NextResponse.json(
        { message: "Checklist y evaluador son obligatorios" },
        { status: 400 }
      );
    }

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return NextResponse.json(
        { message: "El checklist no existe" },
        { status: 400 }
      );
    }

    const created = [];
    for (const evaluatorId of evaluatorIds) {
      const evaluator = await User.findById(evaluatorId);
      const evaluatorRoles = Array.isArray(evaluator?.roles) && evaluator.roles.length
        ? evaluator.roles
        : [evaluator?.role];
      if (!evaluator || !evaluatorRoles.includes("evaluator")) {
        return NextResponse.json(
          { message: "El usuario elegido no es un evaluador valido" },
          { status: 400 }
        );
      }

      const evaluation = await Evaluation.create({
        checklist: checklistId,
        assignedTo: evaluatorId,
        assignedBy: payload.id,
        notes
      });

      await evaluation.populate("checklist", "title");
      await evaluation.populate("assignedTo", "firstName lastName username role");
      created.push(normalizeEvaluation(evaluation));
    }

    return NextResponse.json({ evaluations: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/evaluations", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando evaluacion" },
      { status: 500 }
    );
  }
}
