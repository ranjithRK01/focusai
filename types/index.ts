export type Prediction = 'aligned' | 'off-track' | 'neutral';
export type ReviewLabel = 'aligned' | 'off-track';
export type NudgeAction = 'skipped' | 'watched' | 'timer';

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

export interface Goal {
  _id: string;
  userId: string;
  clerkId: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchHistory {
  _id: string;
  userId: string;
  clerkId: string;
  videoId?: string;
  title: string;
  channel: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  watchTime: number;
  percentage: number;
  watchedAt: Date;
  predictionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysis {
  _id: string;
  watchHistoryId: string;
  userId: string;
  clerkId: string;
  prediction: Prediction;
  confidence: number;
  reason: string;
  goalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  _id: string;
  userId: string;
  clerkId: string;
  watchHistoryId: string;
  label: ReviewLabel;
  aiAnalysisId?: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nudge {
  _id: string;
  userId: string;
  clerkId: string;
  watchHistoryId?: string;
  videoUrl: string;
  videoTitle: string;
  distractionScore: number;
  action?: NudgeAction;
  timerDuration?: number;
  actionTakenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Metric {
  _id: string;
  userId: string;
  clerkId: string;
  date: Date;
  streak: number;
  reviewsCompleted: number;
  estimatedTimeSaved: number;
  focusScore: number;
  topProductiveChannels: Array<{ name: string; count: number }>;
  topDistractingChannels: Array<{ name: string; count: number }>;
  createdAt: Date;
  updatedAt: Date;
}
