import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import cloudinary, { assertCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  try {
    verifyToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export async function POST(req) {
  try {
    await requireAuth();
    assertCloudinaryConfigured();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "Falta el archivo a subir" },
        { status: 400 }
      );
    }

    const contentType = file.type || "application/octet-stream";
    const isImage = contentType.startsWith("image/");
    const allowedDocs = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!isImage && !allowedDocs.includes(contentType)) {
      return NextResponse.json(
        { message: "Solo se permiten imagenes o PDF/DOC" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const uploadStr = `data:${contentType};base64,${base64}`;

    const folder = formData.get("folder") === "documents"
      ? "asistencia/documents"
      : "asistencia/avatars";

    const uploadOptions = {
      folder,
      resource_type: isImage ? "image" : "auto",
      use_filename: true,
      unique_filename: true
    };

    if (isImage) {
      uploadOptions.transformation = [{ width: 800, height: 800, crop: "limit" }];
    }

    const uploadResult = await cloudinary.uploader.upload(uploadStr, uploadOptions);

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      originalFilename: uploadResult.original_filename,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      resourceType: uploadResult.resource_type
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
