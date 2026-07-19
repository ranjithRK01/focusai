import mongoose, { Document, Schema } from 'mongoose';

export type PredictionResult = 'ALIGNED' | 'DISTRACTING' | 'UNKNOWN';
export type Category = 'productive' | 'distraction';

export interface IPrediction extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  watchHistoryId?: mongoose.Types.ObjectId;
  videoId?: string;
  videoTitle: string;
  videoChannel: string;
  videoUrl?: string;
  videoThumbnail?: string;
  prediction: PredictionResult;
  confidence: number;
  reason: string;
  topics: string[];
  category: Category;
  goalSnapshot: string;
  userContextSnapshot: any;
  expiredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PredictionSchema = new Schema<IPrediction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  watchHistoryId: { type: Schema.Types.ObjectId, ref: 'WatchHistory' },
  videoId: { type: String, index: true },
  videoTitle: { type: String, required: true },
  videoChannel: { type: String, required: true },
  videoUrl: { type: String },
  videoThumbnail: { type: String },
  prediction: { type: String, enum: ['ALIGNED', 'DISTRACTING', 'UNKNOWN'], required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  reason: { type: String, required: true },
  topics: [{ type: String }],
  category: { type: String, enum: ['productive', 'distraction'], required: true },
  goalSnapshot: { type: String, required: true },
  userContextSnapshot: { type: Schema.Types.Mixed },
  expiredAt: { type: Date, required: true },
}, { timestamps: true });

PredictionSchema.index({ clerkId: 1, createdAt: -1 });
PredictionSchema.index({ clerkId: 1, videoTitle: 1, videoChannel: 1 });
PredictionSchema.index({ clerkId: 1, videoId: 1, expiredAt: 1 });

export default mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema);
