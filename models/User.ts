import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  goalId?: string;
  focusScore?: number;
  streak?: number;
  subscription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  firstName: String,
  lastName: String,
  imageUrl: String,
  goalId: String,
  focusScore: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  subscription: String,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);