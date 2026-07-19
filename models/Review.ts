import mongoose, { Document, Schema } from 'mongoose';

export type ReviewLabel = 'aligned' | 'off-track';

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  watchHistoryId: mongoose.Types.ObjectId;
  label: ReviewLabel;
  aiAnalysisId?: mongoose.Types.ObjectId;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  watchHistoryId: { type: Schema.Types.ObjectId, ref: 'WatchHistory', required: true },
  label: { type: String, enum: ['aligned', 'off-track'], required: true },
  aiAnalysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis' },
  reviewedAt: { type: Date, required: true },
}, { timestamps: true });

// Compound index for quick lookup
ReviewSchema.index({ clerkId: 1, watchHistoryId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
