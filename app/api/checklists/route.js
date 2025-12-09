import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Checklist from "@/models/Checklist";

export const runtime = "nodejs";

async function requireRole(allowRoles) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  if (!allowRoles.includes(payload.role)) throw new Error("FORBIDDEN");
  return payload;
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `item-${Math.random().toString(16).slice(2)}`;
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const title = (item?.title || "").toString().trim();
      if (!title) return null;
      return {
        id: item.id || makeId(),
        title,
        hasCheck: item?.hasCheck === false ? false : true,
        children: sanitizeItems(item.children || [])
      };
    })
    .filter(Boolean);
}

function normalizeChecklist(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    description: c.description || "",
    items: Array.isArray(c.items) ? c.items : [],
    createdAt: c.createdAt
  };
}

export async function GET() {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const checklists = await Checklist.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({
      checklists: checklists.map(normalizeChecklist)
    });
  } catch (err) {
    console.error("GET /api/checklists", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo checklists" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const payload = await requireRole(["admin"]);

    const body = await req.json();
    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const items = sanitizeItems(body.items || []);

    if (!title) {
      return NextResponse.json(
        { message: "El nombre del checklist es obligatorio" },
        { status: 400 }
      );
    }
    if (items.length === 0) {
      return NextResponse.json(
        { message: "Agrega al menos una pregunta al checklist" },
        { status: 400 }
      );
    }

    const checklist = await Checklist.create({
      title,
      description,
      items,
      createdBy: payload.id
    });

    return NextResponse.json(
      { checklist: normalizeChecklist(checklist) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/checklists", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando checklist" },
      { status: 500 }
    );
  }
}
