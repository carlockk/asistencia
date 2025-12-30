import mongoose, { Schema } from "mongoose";

const ResponseSchema = new Schema(
  {
    itemId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    comment: { type: String, default: "" }
  },
  { _id: false }
);

const EvaluationSchema = new Schema(
  {
    checklist: { type: Schema.Types.ObjectId, ref: "Checklist", required: true },
    schedule: { type: Schema.Types.ObjectId, ref: "EvaluationSchedule" },
    periodKey: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // Empleado evaluado (opcional para checklists generales)
    employee: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending"
    },
    responses: {
      type: [ResponseSchema],
      default: []
    },
    submittedAt: Date,
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

EvaluationSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
EvaluationSchema.index({ employee: 1, status: 1, createdAt: -1 });
EvaluationSchema.index({ schedule: 1, periodKey: 1 });

export default mongoose.models.Evaluation ||
  mongoose.model("Evaluation", EvaluationSchema);
