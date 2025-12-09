import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Checklist from "@/models/Checklist";

export const runtime = "nodejs";

async function requireRole() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  if (payload.role !== "admin") throw new Error("FORBIDDEN");
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

export async function GET(_req, { params }) {
  try {
    await connectDB();
    await requireRole();
    const checklist = await Checklist.findById(params.id);
    if (!checklist) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      checklist: {
        id: checklist._id.toString(),
        title: checklist.title,
        description: checklist.description || "",
        items: Array.isArray(checklist.items) ? checklist.items : []
      }
    });
  } catch (err) {
    console.error("GET /api/checklists/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo checklist" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    await requireRole();

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

    const updated = await Checklist.findByIdAndUpdate(
      params.id,
      { title, description, items },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      checklist: {
        id: updated._id.toString(),
        title: updated.title,
        description: updated.description || "",
        items: Array.isArray(updated.items) ? updated.items : []
      }
    });
  } catch (err) {
    console.error("PUT /api/checklists/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error actualizando checklist" },
      { status: 500 }
    );
  }
}
