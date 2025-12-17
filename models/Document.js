import mongoose, { Schema } from "mongoose";

const DocumentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, default: "" },
    status: {
      type: String,
      enum: ["vigente", "en_revision", "archivado"],
      default: "vigente"
    },
    issuedAt: { type: String, default: "" }, // YYYY-MM-DD
    expiresAt: { type: String, default: "" }, // YYYY-MM-DD (opcional)
    notes: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String, default: "" }
  },
  { timestamps: true }
);

DocumentSchema.index({ user: 1, type: 1, status: 1, createdAt: -1 });

export default mongoose.models.Document ||
  mongoose.model("Document", DocumentSchema);
