import mongoose, { Document, Schema } from 'mongoose';

export type Prediction = 'aligned' | 'off-track' | 'neutral';

export interface IAIAnalysis extends Document {
  watchHistoryId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  prediction: Prediction;
  confidence: number;
  reason: string;
  goalId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIAnalysisSchema = new Schema<IAIAnalysis>({
  watchHistoryId: { type: Schema.Types.ObjectId, ref: 'WatchHistory', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clerkId: { type: String, required: true, index: true },
  prediction: { type: String, enum: ['aligned', 'off-track', 'neutral'], required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  reason: { type: String, required: true },
  goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
}, { timestamps: true });

export default mongoose.models.AIAnalysis || mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
