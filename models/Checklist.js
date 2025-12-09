import mongoose, { Schema } from "mongoose";

const ChecklistSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    // Se guarda como arbol de items [{ id, title, children: [...] }]
    items: {
      type: Array,
      default: []
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

ChecklistSchema.index({ title: 1 });

export default mongoose.models.Checklist ||
  mongoose.model("Checklist", ChecklistSchema);
