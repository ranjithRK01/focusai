import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  date: Date;
  streak: number;
  reviewsCompleted: number;
  estimatedTimeSaved: number; // in minutes
  focusScore: number; // 0-100
  topProductiveChannels: Array<{ name: string; count: number }>;
  topDistractingChannels: Array<{ name: string; count: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  streak: { type: Number, default: 0 },
  reviewsCompleted: { type: Number, default: 0 },
  estimatedTimeSaved: { type: Number, default: 0 },
  focusScore: { type: Number, default: 0 },
  topProductiveChannels: [{ name: String, count: Number }],
  topDistractingChannels: [{ name: String, count: Number }],
}, { timestamps: true });

// Ensure one metric per user per day
MetricSchema.index({ clerkId: 1, date: 1 }, { unique: true });

export default mongoose.models.Metric || mongoose.model<IMetric>('Metric', MetricSchema);
