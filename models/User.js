import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "employee"],
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

export default mongoose.models.User || mongoose.model("User", UserSchema);
