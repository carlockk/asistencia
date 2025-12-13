import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRolesFromUser, pickPrimaryRole, verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    const payload = verifyToken(token);

    await connectDB();
    const user = await User.findById(payload.id);
    if (!user) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    const roles = getRolesFromUser(user);

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: pickPrimaryRole(roles),
        roles,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        address: user.address,
        commune: user.commune,
        city: user.city
      }
    });
  } catch (err) {
    console.error("GET /api/me", err);
    return NextResponse.json(
      { message: "Error obteniendo perfil" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    const payload = verifyToken(token);

    await connectDB();
    const body = await req.json();

    const update = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      avatarUrl: body.avatarUrl,
      address: body.address,
      commune: body.commune,
      city: body.city
    };

    const user = await User.findByIdAndUpdate(payload.id, update, {
      new: true
    });

    if (!user) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username
      }
    });
  } catch (err) {
    console.error("PUT /api/me", err);
    return NextResponse.json(
      { message: "Error actualizando perfil" },
      { status: 500 }
    );
  }
}
