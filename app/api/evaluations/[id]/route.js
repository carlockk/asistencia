import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Evaluation from "@/models/Evaluation";
import User from "@/models/User";

export const runtime = "nodejs";

const RATING_VALUES = ["siempre", "casi_siempre", "aveces", "nunca"];

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
    employee: ev.employee?._id?.toString() || ev.employee?.toString?.(),
    employeeName: ev.employee
      ? `${ev.employee.firstName || ""} ${ev.employee.lastName || ""}`.trim() ||
        ev.employee.username
      : "General",
    responses: ev.responses || []
  };
}

function sanitizeResponses(responses) {
  if (!Array.isArray(responses)) return [];
  return responses
    .map((r) => {
      const value = r?.value;
      const itemId = (r?.itemId || "").toString().trim();
      if (!itemId) return null;
      const trimmed =
        typeof value === "string" ? value.toString().trim() : value;
      if (trimmed === "" || trimmed === null || trimmed === undefined) return null;
      return {
        itemId,
        value: trimmed,
        comment: (r?.comment || "").toString().trim()
      };
    })
    .filter(Boolean);
}

function collectCheckableIds(items = [], acc = []) {
  items.forEach((item) => {
    const fieldType = item?.fieldType || item?.type;
    const hasCheck = fieldType === "section" ? false : item?.hasCheck !== false;
    if (hasCheck && item?.id) acc.push(item.id);
    if (item?.children?.length) collectCheckableIds(item.children, acc);
  });
  return acc;
}

function fieldTypeFor(item) {
  if (item?.fieldType) return item.fieldType;
  if (item?.type) return item.type;
  if (item?.hasCheck === false) return "section";
  return "rating";
}

function allowedValuesFor(item, fieldType) {
  if (Array.isArray(item?.options) && item.options.length > 0) {
    return item.options.map((o) => o.value || o.label);
  }
  if (fieldType === "rating") return RATING_VALUES;
  return [];
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const evaluation = await Evaluation.findById(params.id)
      .populate("checklist")
      .populate("assignedTo", "firstName lastName username role")
      .populate("employee", "firstName lastName username role");

    if (!evaluation) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (
      !roles.includes("admin") &&
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

    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (!roles.includes("admin") && evaluation.assignedTo?._id?.toString() !== payload.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    if (!roles.includes("evaluator") && !roles.includes("admin")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const responses = sanitizeResponses(body.responses || []);
    const rawEmployeeId = (body.employeeId || "").toString().trim();
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
    if (checkableIds.length > 0) {
      const itemMap = new Map();
      (evaluation.checklist?.items || []).forEach(function walk(item) {
        if (item?.id) {
          const fieldType = fieldTypeFor(item);
          if (fieldType !== "section") {
            itemMap.set(item.id.toString(), {
              type: fieldType,
              options: allowedValuesFor(item, fieldType)
            });
          }
        }
        if (item?.children?.length) item.children.forEach(walk);
      });

      const responseMap = new Map(responses.map((r) => [r.itemId, r.value]));
      const missing = Array.from(itemMap.keys()).some((id) => {
        const val = responseMap.get(id);
        return val === undefined || val === null || val === "";
      });
      if (missing) {
        return NextResponse.json(
          { message: "Completa todas las preguntas antes de enviar." },
          { status: 400 }
        );
      }

      const invalid = responses.some((r) => {
        const item = itemMap.get(r.itemId);
        if (!item) return false;
        const value = r.value;
        switch (item.type) {
          case "rating":
          case "select":
            return !item.options.includes(value);
          case "boolean": {
            const allowed = ["si", "no", "true", "false", true, false, "1", "0"];
            return !allowed.includes(value);
          }
          case "number": {
            if (typeof value === "number") return !Number.isFinite(value);
            const parsed = Number(value);
            return Number.isNaN(parsed);
          }
          case "date": {
            if (typeof value !== "string") return true;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime());
          }
          case "time":
            return typeof value !== "string" || !isValidTime(value);
          case "text":
            return typeof value !== "string" || value.trim().length === 0;
          default:
            return false;
        }
      });
      if (invalid) {
        return NextResponse.json(
          { message: "Hay respuestas con opciones no permitidas" },
          { status: 400 }
        );
      }
    }

    // Si se envía un empleado, validamos que exista y sea rol employee
    if (rawEmployeeId) {
      const employee = await User.findById(rawEmployeeId);
      const employeeRoles = Array.isArray(employee?.roles) && employee.roles.length
        ? employee.roles
        : [employee?.role];
      if (!employee || !employeeRoles.includes("employee")) {
        return NextResponse.json(
          { message: "El empleado seleccionado no es valido" },
          { status: 400 }
        );
      }
      evaluation.employee = employee._id;
    } else {
      evaluation.employee = undefined;
    }

    evaluation.responses = responses;
    evaluation.status = "completed";
    evaluation.submittedAt = new Date();
    evaluation.notes = (body.notes || "").toString().trim();

    await evaluation.save();

    const populated = await evaluation
      .populate("checklist")
      .populate("employee", "firstName lastName username role");

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
    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (!roles.includes("admin")) {
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
