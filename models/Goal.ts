import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Ensure only one active goal per user
GoalSchema.index({ clerkId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);
