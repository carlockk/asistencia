import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  await connectDB();

  const existing = await User.findOne({
    $or: [{ role: "admin" }, { roles: "admin" }]
  });
  if (existing) {
    return NextResponse.json({
      message: "Ya existe al menos un admin, no se creó otro.",
      admin: {
        username: existing.username,
        email: existing.email
      }
    });
  }

  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    username: "admin",
    passwordHash,
    role: "admin",
    roles: ["admin"],
    firstName: "Admin",
    lastName: "Principal",
    email: "admin@example.com"
  });

  return NextResponse.json({
    message: "Admin inicial creado",
    admin: {
      username: admin.username,
      password,
      email: admin.email
    }
  });
}
