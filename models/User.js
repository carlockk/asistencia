import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "employee", "evaluator"],
      default: "employee"
    },
    firstName: String,
    lastName: String,
    docType: { type: String, default: "RUT" },
    docNumber: String,
    address: String,
    commune: String,
    city: String,
    email: String,
    hourlyRate: { type: Number, default: 0 },
    observation: String,
    avatarUrl: String
  },
  { timestamps: true }
);

// Forzar recompilar el modelo en dev si cambio el schema (evita enums antiguos)
delete mongoose.models.User;
export default mongoose.model("User", UserSchema);
