import mongoose, { Document, Schema } from 'mongoose';

export type NudgeAction = 'skipped' | 'watched' | 'timer';

export interface INudge extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  watchHistoryId?: mongoose.Types.ObjectId;
  videoUrl: string;
  videoTitle: string;
  distractionScore: number;
  action?: NudgeAction;
  timerDuration?: number; // in seconds
  actionTakenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NudgeSchema = new Schema<INudge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  watchHistoryId: { type: Schema.Types.ObjectId, ref: 'WatchHistory' },
  videoUrl: { type: String, required: true },
  videoTitle: { type: String, required: true },
  distractionScore: { type: Number, required: true, min: 0, max: 100 },
  action: { type: String, enum: ['skipped', 'watched', 'timer'] },
  timerDuration: { type: Number }, // in seconds
  actionTakenAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Nudge || mongoose.model<INudge>('Nudge', NudgeSchema);
