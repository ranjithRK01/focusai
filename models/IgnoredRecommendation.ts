import mongoose, { Document, Schema } from 'mongoose';

export interface IIgnoredRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  predictionId: mongoose.Types.ObjectId;
  watchHistoryId?: mongoose.Types.ObjectId;
  videoTitle: string;
  videoChannel: string;
  videoUrl?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IgnoredRecommendationSchema = new Schema<IIgnoredRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction', required: true },
  watchHistoryId: { type: Schema.Types.ObjectId, ref: 'WatchHistory' },
  videoTitle: { type: String, required: true },
  videoChannel: { type: String, required: true },
  videoUrl: { type: String },
  timestamp: { type: Date, required: true },
}, { timestamps: true });

IgnoredRecommendationSchema.index({ clerkId: 1, timestamp: -1 });

export default mongoose.models.IgnoredRecommendation || mongoose.model<IIgnoredRecommendation>('IgnoredRecommendation', IgnoredRecommendationSchema);
