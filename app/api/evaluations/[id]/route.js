import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Evaluation from "@/models/Evaluation";

export const runtime = "nodejs";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  return verifyToken(token);
}

function normalizeDetail(ev) {
  return {
    id: ev._id.toString(),
    status: ev.status,
    createdAt: ev.createdAt,
    submittedAt: ev.submittedAt,
    notes: ev.notes || "",
    checklist: ev.checklist
      ? {
          id:
            ev.checklist._id?.toString() ||
            (typeof ev.checklist === "string"
              ? ev.checklist
              : ev.checklist?.toString?.()),
          title: ev.checklist.title,
          description: ev.checklist.description || "",
          items: Array.isArray(ev.checklist.items) ? ev.checklist.items : []
        }
      : null,
    assignedTo: ev.assignedTo?._id?.toString() || ev.assignedTo?.toString?.(),
    evaluatorName: ev.assignedTo
      ? `${ev.assignedTo.firstName || ""} ${ev.assignedTo.lastName || ""}`.trim() ||
        ev.assignedTo.username
      : "Evaluador",
    responses: ev.responses || []
  };
}

function sanitizeResponses(responses) {
  if (!Array.isArray(responses)) return [];
  const allowed = new Set(["siempre", "casi_siempre", "aveces", "nunca"]);
  return responses
    .map((r) => {
      const value = r?.value;
      const itemId = (r?.itemId || "").toString().trim();
      if (!itemId || !allowed.has(value)) return null;
      return {
        itemId,
        value,
        comment: (r?.comment || "").toString().trim()
      };
    })
    .filter(Boolean);
}

function collectCheckableIds(items = [], acc = []) {
  items.forEach((item) => {
    const hasCheck = item?.hasCheck !== false;
    if (hasCheck && item?.id) acc.push(item.id);
    if (item?.children?.length) collectCheckableIds(item.children, acc);
  });
  return acc;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const evaluation = await Evaluation.findById(params.id)
      .populate("checklist")
      .populate("assignedTo", "firstName lastName username role");

    if (!evaluation) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    if (
      payload.role !== "admin" &&
      evaluation.assignedTo?._id?.toString() !== payload.id
    ) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json({ evaluation: normalizeDetail(evaluation) });
  } catch (err) {
    console.error("GET /api/evaluations/[id]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo evaluacion" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const body = await req.json();
    const evaluation = await Evaluation.findById(params.id)
      .populate("assignedTo", "role")
      .populate("checklist");

    if (!evaluation) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    if (evaluation.assignedTo?._id?.toString() !== payload.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    if (payload.role !== "evaluator") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const responses = sanitizeResponses(body.responses || []);
    const checkableIds = collectCheckableIds(
      evaluation.checklist?.items || [],
      []
    );
    if (checkableIds.length > 0 && responses.length === 0) {
      return NextResponse.json(
        { message: "Agrega respuestas al checklist" },
        { status: 400 }
      );
    }

    evaluation.responses = responses;
    evaluation.status = "completed";
    evaluation.submittedAt = new Date();
    evaluation.notes = (body.notes || "").toString().trim();

    await evaluation.save();

    const populated = await evaluation.populate("checklist");

    return NextResponse.json({
      evaluation: normalizeDetail(populated)
    });
  } catch (err) {
    console.error("PUT /api/evaluations/[id]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error guardando evaluacion" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const payload = await requireAuth();
    if (payload.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const deleted = await Evaluation.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/evaluations/[id]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error eliminando evaluacion" },
      { status: 500 }
    );
  }
}
