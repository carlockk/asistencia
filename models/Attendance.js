import mongoose, { Schema } from "mongoose";

const AttendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // YYYY-MM-DD
    date: { type: String, required: true },
    entryTime: Date,
    exitTime: Date,
    minutesWorked: { type: Number, default: 0 },
    entryAttempts: { type: Number, default: 0 },
    lastEntryAttemptAt: Date,
    exitAttempts: { type: Number, default: 0 },
    lastExitAttemptAt: Date
  },
  { timestamps: true }
);

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);
