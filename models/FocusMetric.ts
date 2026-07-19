import mongoose, { Document, Schema } from 'mongoose';

export type MetricType = 'aligned_watched' | 'review_completed' | 'skipped_distraction' | 'finished_timer' | 'watched_distraction' | 'ignored_warning';

export interface IFocusMetric extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  type: MetricType;
  score: number;
  description: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FocusMetricSchema = new Schema<IFocusMetric>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['aligned_watched', 'review_completed', 'skipped_distraction', 'finished_timer', 'watched_distraction', 'ignored_warning'],
    required: true
  },
  score: { type: Number, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, required: true },
}, { timestamps: true });

FocusMetricSchema.index({ clerkId: 1, timestamp: -1 });

export default mongoose.models.FocusMetric || mongoose.model<IFocusMetric>('FocusMetric', FocusMetricSchema);
