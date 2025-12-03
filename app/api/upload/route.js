import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import cloudinary, { assertCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

function requireAuth() {
  const token = cookies().get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  verifyToken(token);
}

export async function POST(req) {
  try {
    requireAuth();
    assertCloudinaryConfigured();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "Falta el archivo a subir" },
        { status: 400 }
      );
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json(
        { message: "Solo se permiten imagenes" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "asistencia/avatars",
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit" }]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });
  } catch (err) {
    console.error("POST /api/upload", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    if (err.message === "Cloudinary no configurado") {
      return NextResponse.json(
        { message: "Cloudinary no configurado en el servidor" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "Error subiendo la imagen" },
      { status: 500 }
    );
  }
}
