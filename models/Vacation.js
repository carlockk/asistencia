import mongoose, { Schema } from "mongoose";

const VacationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

VacationSchema.index({ user: 1, startDate: 1, endDate: 1 });

export default mongoose.models.Vacation ||
  mongoose.model("Vacation", VacationSchema);
