import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Evaluation from "@/models/Evaluation";
import Checklist from "@/models/Checklist";
import EvaluationSchedule from "@/models/EvaluationSchedule";
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
    employeeId:
      ev.employee?._id?.toString() ||
      (typeof ev.employee === "string" ? ev.employee : ev.employee?.toString?.()),
    employeeName: ev.employee ? formatUserName(ev.employee) : "General",
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

function isValidTime(value) {
  if (!value) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function periodKeyFor(date, frequency) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  if (frequency === "monthly") {
    return `${year}-${month}`;
  }
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function createEvaluationIfMissing(schedule, now) {
  const periodKey = periodKeyFor(now, schedule.frequency);
  const existing = await Evaluation.findOne({
    schedule: schedule._id,
    periodKey
  }).select("_id");
  if (existing) return null;

  const evaluation = await Evaluation.create({
    checklist: schedule.checklist,
    schedule: schedule._id,
    periodKey,
    assignedTo: schedule.evaluator,
    assignedBy: schedule.createdBy,
    employee: schedule.employee || undefined,
    notes: schedule.notes || ""
  });

  await evaluation.populate("checklist", "title");
  await evaluation.populate("assignedTo", "firstName lastName username role");
  await evaluation.populate("employee", "firstName lastName username role");
  return evaluation;
}

async function ensureScheduledEvaluations(payload, roles) {
  const scheduleFilter = { active: true };
  if (!roles.includes("admin")) {
    scheduleFilter.evaluator = payload.id;
  }
  const schedules = await EvaluationSchedule.find(scheduleFilter);
  if (schedules.length === 0) return;
  const now = new Date();
  for (const schedule of schedules) {
    await createEvaluationIfMissing(schedule, now);
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const payload = await requireAuth();
    const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
    if (!roles.includes("admin") && !roles.includes("evaluator")) {
      throw new Error("FORBIDDEN");
    }
    await ensureScheduledEvaluations(payload, roles);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("pageSize") || "10", 10))
    );
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const employeeId = (searchParams.get("employeeId") || "").trim();
    const checklistId = (searchParams.get("checklistId") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const filter = roles.includes("admin") ? {} : { assignedTo: payload.id };

    if (employeeId) {
      if (employeeId === "none") {
        filter.employee = null;
      } else {
        filter.employee = employeeId;
      }
    }
    if (checklistId) {
      filter.checklist = checklistId;
    }
    if (status && ["pending", "completed"].includes(status)) {
      filter.status = status;
    }

    let evaluations = await Evaluation.find(filter)
      .sort({ createdAt: -1 })
      .populate("checklist", "title")
      .populate("assignedTo", "firstName lastName username role")
      .populate("employee", "firstName lastName username role");

    evaluations = evaluations.filter((ev) => {
      if (from || to) {
        const created = ev.createdAt ? new Date(ev.createdAt) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to && created > endOfDay(to)) return false;
      }
      if (q) {
        const text = `${ev.checklist?.title || ""} ${formatUserName(ev.assignedTo)} ${formatUserName(
          ev.employee
        )} ${ev.notes || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const total = evaluations.length;
    const statusCounts = evaluations.reduce(
      (acc, ev) => {
        acc[ev.status] = (acc[ev.status] || 0) + 1;
        return acc;
      },
      { pending: 0, completed: 0 }
    );
    const byEmployee = new Map();
    const byChecklist = new Map();
    evaluations.forEach((ev) => {
      const empName = ev.employee ? formatUserName(ev.employee) : "General";
      const checklistName = ev.checklist?.title || "Checklist";
      const empData = byEmployee.get(empName) || { name: empName, total: 0, completed: 0 };
      const chkData =
        byChecklist.get(checklistName) || { name: checklistName, total: 0, completed: 0 };
      empData.total += 1;
      chkData.total += 1;
      if (ev.status === "completed") {
        empData.completed += 1;
        chkData.completed += 1;
      }
      byEmployee.set(empName, empData);
      byChecklist.set(checklistName, chkData);
    });

    const paged = evaluations.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      evaluations: paged.map(normalizeEvaluation),
      page,
      pageSize,
      total,
      summary: {
        total,
        pending: statusCounts.pending || 0,
        completed: statusCounts.completed || 0,
        completionRate: total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0,
        byEmployee: Array.from(byEmployee.values()),
        byChecklist: Array.from(byChecklist.values())
      }
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
    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.filter(Boolean)
      : [];
    const applyToAllEmployees = Boolean(body.applyToAllEmployees);
    const notes = (body.notes || "").trim();
    const recurrence = body.recurrence || {};
    const recurrenceEnabled = Boolean(recurrence.enabled);
    const frequency = (recurrence.frequency || "").toString().trim().toLowerCase();
    const dueTime = (recurrence.dueTime || "").toString().trim();

    if (!checklistId || evaluatorIds.length === 0) {
      return NextResponse.json(
        { message: "Checklist y evaluador son obligatorios" },
        { status: 400 }
      );
    }
    if (recurrenceEnabled) {
      if (!["daily", "monthly"].includes(frequency)) {
        return NextResponse.json(
          { message: "Periodicidad invalida" },
          { status: 400 }
        );
      }
      if (!isValidTime(dueTime)) {
        return NextResponse.json(
          { message: "La hora limite no es valida" },
          { status: 400 }
        );
      }
    }

    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return NextResponse.json(
        { message: "El checklist no existe" },
        { status: 400 }
      );
    }

    let targetEmployeeIds = [...new Set(employeeIds.map((id) => id.toString()))];
    if (applyToAllEmployees) {
      const employees = await User.find({
        $or: [{ role: "employee" }, { roles: "employee" }]
      }).select("_id");
      targetEmployeeIds = employees.map((e) => e._id.toString());
    }
    // Si no se especifica empleado, se crea como checklist general
    if (targetEmployeeIds.length === 0) {
      targetEmployeeIds = [null];
    }

    const created = [];
    for (const evaluatorId of evaluatorIds) {
      const evaluator = await User.findById(evaluatorId);
      const evaluatorRoles = Array.isArray(evaluator?.roles) && evaluator.roles.length
        ? evaluator.roles
        : [evaluator?.role];
      if (
        !evaluator ||
        (!evaluatorRoles.includes("evaluator") && !evaluatorRoles.includes("admin"))
      ) {
        return NextResponse.json(
          { message: "El usuario elegido no es valido" },
          { status: 400 }
        );
      }

      for (const empId of targetEmployeeIds) {
        if (empId) {
          const employee = await User.findById(empId);
          const employeeRoles = Array.isArray(employee?.roles) && employee.roles.length
            ? employee.roles
            : [employee?.role];
          if (!employee || !employeeRoles.includes("employee")) {
            return NextResponse.json(
              { message: "El empleado seleccionado no es valido" },
              { status: 400 }
            );
          }
        }

        if (recurrenceEnabled) {
          const scheduleFilter = {
            checklist: checklistId,
            evaluator: evaluatorId,
            employee: empId || null,
            frequency,
            dueTime: dueTime || "",
            active: true
          };
          let schedule = await EvaluationSchedule.findOne(scheduleFilter);
          if (!schedule) {
            schedule = await EvaluationSchedule.create({
              checklist: checklistId,
              evaluator: evaluatorId,
              employee: empId || undefined,
              createdBy: payload.id,
              frequency,
              dueTime: dueTime || "",
              notes
            });
          }
          const createdEval = await createEvaluationIfMissing(schedule, new Date());
          if (createdEval) {
            created.push(normalizeEvaluation(createdEval));
          }
        } else {
          const evaluation = await Evaluation.create({
            checklist: checklistId,
            assignedTo: evaluatorId,
            assignedBy: payload.id,
            employee: empId || undefined,
            notes
          });

          await evaluation.populate("checklist", "title");
          await evaluation.populate("assignedTo", "firstName lastName username role");
          await evaluation.populate("employee", "firstName lastName username role");
          created.push(normalizeEvaluation(evaluation));
        }
      }
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
