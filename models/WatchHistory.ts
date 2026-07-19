import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  videoId?: string;
  title: string;
  channel: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  watchTime?: number;
  percentage?: number;
  watchedAt: Date;
  predictionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WatchHistorySchema = new Schema<IWatchHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  videoId: { type: String },
  title: { type: String, required: true },
  channel: { type: String, required: true },
  url: { type: String, required: true },
  thumbnail: { type: String },
  duration: { type: Number }, // in seconds
  watchTime: { type: Number, default: 0 }, // in seconds
  percentage: { type: Number, default: 0 }, // 0-100
  watchedAt: { type: Date, required: true },
  predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction' },
}, { timestamps: true });

WatchHistorySchema.index({ clerkId: 1, watchedAt: -1 });
WatchHistorySchema.index({ clerkId: 1, videoId: 1 });

export default mongoose.models.WatchHistory || mongoose.model<IWatchHistory>('WatchHistory', WatchHistorySchema);
