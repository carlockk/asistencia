import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  ALLOWED_ROLES,
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

export async function GET(req) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const filter = {};
    if (role && ALLOWED_ROLES.includes(role)) {
      filter.$or = [{ role }, { roles: role }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        roles: getRolesFromUser(u),
        firstName: u.firstName,
        lastName: u.lastName,
        docType: u.docType,
        docNumber: u.docNumber,
        address: u.address,
        commune: u.commune,
        city: u.city,
        email: u.email,
        hourlyRate: u.hourlyRate,
        observation: u.observation,
        avatarUrl: u.avatarUrl || ""
      }))
    });
  } catch (err) {
    console.error("GET /api/users", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error listando usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    await requireAdmin();

    const body = await req.json();

    const {
      username,
      password,
      roles: rawRoles,
      role,
      firstName,
      lastName,
      docType,
      docNumber,
      address,
      commune,
      city,
      email,
      hourlyRate,
      observation,
      avatarUrl
    } = body;

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return NextResponse.json(
        { message: "Ese usuario ya existe" },
        { status: 400 }
      );
    }

    const roles = normalizeRoles(
      rawRoles !== undefined ? rawRoles : role,
      "employee"
    );
    const primaryRole = pickPrimaryRole(roles);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
      role: primaryRole,
      roles,
      firstName,
      lastName,
      docType,
      docNumber,
      address,
      commune,
      city,
      email,
      hourlyRate: Number(hourlyRate) || 0,
      observation,
      avatarUrl
    });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
          roles: getRolesFromUser(user),
          avatarUrl: user.avatarUrl || ""
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/users", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Error creando usuario" },
      { status: 500 }
    );
  }
}
