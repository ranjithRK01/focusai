export interface User {
  _id: string;
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