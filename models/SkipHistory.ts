import mongoose, { Document, Schema } from 'mongoose';

export interface ISkipHistory extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  videoId?: string;
  videoTitle: string;
  videoChannel: string;
  videoUrl?: string;
  reason: string;
  predictionId?: mongoose.Types.ObjectId;
  predictionReason?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SkipHistorySchema = new Schema<ISkipHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  videoId: { type: String },
  videoTitle: { type: String, required: true },
  videoChannel: { type: String, required: true },
  videoUrl: { type: String },
  reason: { type: String, required: true },
  predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction' },
  predictionReason: { type: String },
  timestamp: { type: Date, required: true },
}, { timestamps: true });

SkipHistorySchema.index({ clerkId: 1, timestamp: -1 });

export default mongoose.models.SkipHistory || mongoose.model<ISkipHistory>('SkipHistory', SkipHistorySchema);
