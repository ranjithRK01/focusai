export interface User {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  channel: {
    name: string;
    url?: string;
  };
  duration?: number;
  currentTime?: number;
  playbackRate?: number;
  percentageWatched?: number;
  startedAt: Date;
  endedAt?: Date;
  watchedDuration?: number;
}

export interface Prediction {
  prediction: 'aligned' | 'off-track' | 'neutral';
  confidence: number;
  reason: string;
}

export interface WatchEvent {
  type: 'start' | 'progress' | 'end';
  video: Video;
  watchHistoryId?: string;
}

export interface Review {
  watchHistoryId: string;
  label: 'aligned' | 'off-track';
  aiAnalysisId?: string;
}

export interface Timer {
  id: string;
  videoId: string;
  duration: number;
  remainingTime: number;
  startedAt: Date;
}

export interface Settings {
  enableNotifications: boolean;
  enableNudges: boolean;
  enableTimer: boolean;
  autoClose: boolean;
  darkMode: boolean;
  syncInterval: number;
}

export interface Message {
  type:
    | 'VIDEO_STARTED'
    | 'VIDEO_PROGRESS'
    | 'VIDEO_ENDED'
    | 'SHOW_PREDICTION'
    | 'START_TIMER'
    | 'STOP_TIMER'
    | 'TIMER_EXPIRED'
    | 'LOGIN'
    | 'LOGOUT'
    | 'GET_USER'
    | 'USER_UPDATED';
  payload?: any;
}

export interface DailyMetrics {
  date: string; // ISO date string YYYY-MM-DD
  focusMinutes: number;
  learningVideosWatched: number;
  distractingVideosDetected: number;
  distractingVideosSkipped: number;
  videosWatchedAfterReminder: number;
  timeSaved: number; // in minutes
  goalCompletionPercentage: number;
  focusScore: number;
}

export interface WeeklyMetrics {
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string; // ISO date string YYYY-MM-DD
  totalFocusHours: number;
  totalSavedHours: number;
  productiveVideosWatched: number;
  distractionsAvoided: number;
  longestFocusSession: number; // in minutes
}

export interface LifetimeMetrics {
  totalFocusTime: number; // in minutes
  totalDistractionTimePrevented: number; // in minutes
  totalProductiveVideos: number;
  totalSkippedDistractions: number;
  totalGoalsCompleted: number;
  longestStreak: number;
  currentStreak: number;
  bestFocusDay: {
    date: string;
    focusMinutes: number;
  } | null;
  averageDailyFocusTime: number; // in minutes
}

export interface Metrics {
  daily: DailyMetrics;
  weekly: WeeklyMetrics;
  lifetime: LifetimeMetrics;
}
