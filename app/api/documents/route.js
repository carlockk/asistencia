import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Document from "@/models/Document";
import User from "@/models/User";

export const runtime = "nodejs";

const ALLOWED_STATUS = ["vigente", "en_revision", "archivado"];

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
  if (!roles.includes("admin")) throw new Error("FORBIDDEN");
  return payload;
}

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value !== "string") return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

function daysFromToday(ymd) {
  if (!ymd) return null;
  const parts = ymd.split("-").map((p) => Number(p));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const targetUTC = Date.UTC(y, m - 1, d);
  const today = new Date();
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return Math.floor((targetUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

function computeStatus(doc) {
  const days = daysFromToday(doc.expiresAt);
  if (doc.status === "archivado") {
    return { computedStatus: "archivado", daysToExpire: days };
  }
  if (typeof days === "number") {
    if (days < 0) {
      return { computedStatus: "vencido", daysToExpire: days };
    }
    if (days <= 30) {
      return { computedStatus: "por_vencer", daysToExpire: days };
    }
  }
  return { computedStatus: doc.status, daysToExpire: days };
}

function mapDocument(doc) {
  const { computedStatus, daysToExpire } = computeStatus(doc);
  const userName = doc.user
    ? `${doc.user.firstName || ""} ${doc.user.lastName || ""}`.trim() ||
      doc.user.username
    : "Empleado";
  const uploadedByName =
    doc.uploadedByName ||
    (doc.uploadedBy
      ? `${doc.uploadedBy.firstName || ""} ${doc.uploadedBy.lastName || ""}`.trim() ||
        doc.uploadedBy.username
      : "");

  return {
    id: doc._id.toString(),
    userId: doc.user?._id?.toString() || doc.user?.toString(),
    userName,
    type: doc.type,
    title: doc.title || "",
    status: doc.status,
    computedStatus,
    issuedAt: doc.issuedAt || "",
    expiresAt: doc.expiresAt || "",
    daysToExpire,
    notes: doc.notes || "",
    fileUrl: doc.fileUrl || "",
    fileName: doc.fileName || "",
    uploadedBy: doc.uploadedBy?._id?.toString() || doc.uploadedBy?.toString() || "",
    uploadedByName
  };
}

export async function GET(req) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.trim();

    const filter = {};
    if (userId) filter.user = userId;
    if (type) filter.type = type;
    if (status && ALLOWED_STATUS.includes(status)) filter.status = status;
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { type: { $regex: query, $options: "i" } },
        { notes: { $regex: query, $options: "i" } }
      ];
    }

    const documents = await Document.find(filter)
      .populate("user", "firstName lastName username")
      .populate("uploadedBy", "firstName lastName username")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      documents: documents.map((d) => mapDocument(d))
    });
  } catch (err) {
    console.error("GET /api/documents", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo documentos" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const payload = await requireAdmin();

    const body = await req.json();
    const userId = body.userId?.trim();
    const type = body.type?.trim();
    const title = body.title?.trim() || "";
    const status = ALLOWED_STATUS.includes(body.status)
      ? body.status
      : "vigente";
    const issuedAt = normalizeDate(body.issuedAt);
    const expiresAt = normalizeDate(body.expiresAt);
    const notes = body.notes?.trim() || "";
    const fileUrl = body.fileUrl?.trim() || "";
    const fileName = body.fileName?.trim() || "";

    if (!userId || !type) {
      return NextResponse.json(
        { message: "Empleado y tipo de documento son obligatorios" },
        { status: 400 }
      );
    }

    if (issuedAt && expiresAt && issuedAt > expiresAt) {
      return NextResponse.json(
        { message: "La fecha de emision no puede ser mayor que la de vencimiento" },
        { status: 400 }
      );
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return NextResponse.json(
        { message: "El empleado seleccionado no existe" },
        { status: 400 }
      );
    }

    const doc = await Document.create({
      user: userId,
      type,
      title,
      status,
      issuedAt,
      expiresAt,
      notes,
      fileUrl,
      fileName,
      uploadedBy: payload.id,
      uploadedByName: payload.name || ""
    });

    const created = await Document.findById(doc._id)
      .populate("user", "firstName lastName username")
      .populate("uploadedBy", "firstName lastName username");

    return NextResponse.json(
      { document: mapDocument(created) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/documents", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando documento" },
      { status: 500 }
    );
  }
}
