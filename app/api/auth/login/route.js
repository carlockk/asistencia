import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getRolesFromUser, pickPrimaryRole, signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
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
