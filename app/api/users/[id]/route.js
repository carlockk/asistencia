import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  getRolesFromUser,
  normalizeRoles,
  pickPrimaryRole,
  verifyToken
} from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function rolesFromPayload(payload) {
  return Array.isArray(payload.roles) ? payload.roles : [payload.role];
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token);
  const roles = rolesFromPayload(payload);
  if (!roles.includes("admin")) throw new Error("FORBIDDEN");
  return payload;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    await requireAdmin();
    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        roles: getRolesFromUser(user),
        firstName: user.firstName,
        lastName: user.lastName,
        docType: user.docType,
        docNumber: user.docNumber,
        address: user.address,
        commune: user.commune,
        city: user.city,
        email: user.email,
        hourlyRate: user.hourlyRate,
        observation: user.observation,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    console.error("GET /api/users/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error obteniendo usuario" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    await requireAdmin();

    const existing = await User.findById(params.id);
    if (!existing) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }
    const isAdmin = existing.role === "admin" || existing.roles?.includes("admin");

    const body = await req.json();
    const update = { ...body };

    if (body.password) {
      update.passwordHash = await bcrypt.hash(body.password, 10);
    }
    delete update.password;

    if (body.hourlyRate != null) {
      update.hourlyRate = Number(body.hourlyRate) || 0;
    }

    if (isAdmin) {
      // Un admin no se toca: fuerza a que siga siendo admin
      update.roles = ["admin"];
      update.role = "admin";
    } else {
      if (body.roles !== undefined || body.role !== undefined) {
        const roles = normalizeRoles(
          body.roles !== undefined ? body.roles : body.role,
          "employee"
        );
        update.roles = roles;
        update.role = pickPrimaryRole(roles);
      }
    }

    const user = await User.findByIdAndUpdate(params.id, update, {
      new: true
    });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        roles: getRolesFromUser(user)
      }
    });
  } catch (err) {
    console.error("PUT /api/users/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error actualizando usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    await requireAdmin();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/users/[id]", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error eliminando usuario" },
      { status: 500 }
    );
  }
}
