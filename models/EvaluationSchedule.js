import mongoose, { Schema } from "mongoose";

const EvaluationScheduleSchema = new Schema(
  {
    checklist: { type: Schema.Types.ObjectId, ref: "Checklist", required: true },
    evaluator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employee: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    frequency: {
      type: String,
      enum: ["daily", "monthly"],
      required: true
    },
    dueTime: { type: String, default: "" },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

EvaluationScheduleSchema.index({ checklist: 1, evaluator: 1, employee: 1 });
EvaluationScheduleSchema.index({ evaluator: 1, active: 1 });

export default mongoose.models.EvaluationSchedule ||
  mongoose.model("EvaluationSchedule", EvaluationScheduleSchema);
