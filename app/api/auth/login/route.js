import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getRolesFromUser, pickPrimaryRole, signToken } from "@/lib/auth";

export const runtime = "nodejs";

const RATE_LIMIT = {
  max: 8,
  windowMs: 15 * 60 * 1000
};
const attempts = new Map();

function pruneAttempts(key, now) {
  const list = attempts.get(key) || [];
  const next = list.filter((ts) => now - ts < RATE_LIMIT.windowMs);
  attempts.set(key, next);
  return next;
}

export async function POST(req) {
  try {
    await connectDB();
    const { username, password } = await req.json();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `${ip}:${(username || "").toString().toLowerCase()}`;
    const now = Date.now();
    const list = pruneAttempts(key, now);
    if (list.length >= RATE_LIMIT.max) {
      return NextResponse.json(
        { message: "Demasiados intentos. Intenta de nuevo mas tarde." },
        { status: 429 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      attempts.set(key, [...list, now]);
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      attempts.set(key, [...list, now]);
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const roles = getRolesFromUser(user);
    const primaryRole = pickPrimaryRole(roles);
    const token = signToken({
      _id: user._id,
      firstName: user.firstName,
      username: user.username,
      role: primaryRole,
      roles
    });

    const res = NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        roles,
        role: primaryRole,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return res;
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json(
      { message: "Error interno en el login" },
      { status: 500 }
    );
  }
}
