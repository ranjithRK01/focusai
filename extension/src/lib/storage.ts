import type { Settings, User, DailyMetrics, WeeklyMetrics, LifetimeMetrics, Metrics } from '@/types';

const STORAGE_KEYS = {
  TOKEN: 'focusai_token',
  USER: 'focusai_user',
  SETTINGS: 'focusai_settings',
  PREDICTIONS: 'focusai_predictions',
  OFFLINE_QUEUE: 'focusai_offline_queue',
  TIMER: 'focusai_timer',
  METRICS: 'focusai_metrics',
} as const;

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

function initializeDailyMetrics(date: string): DailyMetrics {
  return {
    date,
    focusMinutes: 0,
    learningVideosWatched: 0,
    distractingVideosDetected: 0,
    distractingVideosSkipped: 0,
    videosWatchedAfterReminder: 0,
    timeSaved: 0,
    goalCompletionPercentage: 0,
    focusScore: 0
  };
}

function initializeWeeklyMetrics(): WeeklyMetrics {
  const { startDate, endDate } = getWeekRange();
  return {
    startDate,
    endDate,
    totalFocusHours: 0,
    totalSavedHours: 0,
    productiveVideosWatched: 0,
    distractionsAvoided: 0,
    longestFocusSession: 0
  };
}

function initializeLifetimeMetrics(): LifetimeMetrics {
  return {
    totalFocusTime: 0,
    totalDistractionTimePrevented: 0,
    totalProductiveVideos: 0,
    totalSkippedDistractions: 0,
    totalGoalsCompleted: 0,
    longestStreak: 0,
    currentStreak: 0,
    bestFocusDay: null,
    averageDailyFocusTime: 0
  };
}

export class StorageService {
  static async getToken(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
    return result[STORAGE_KEYS.TOKEN] || null;
  }

  static async setToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN]: token });
  }

  static async removeToken(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.TOKEN);
  }

  static async getUser(): Promise<User | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
    return result[STORAGE_KEYS.USER] || null;
  }

  static async setUser(user: User): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
  }

  static async removeUser(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.USER);
  }

  static async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || {
      enableNotifications: true,
      enableNudges: true,
      enableTimer: true,
      autoClose: false,
      darkMode: false,
      syncInterval: 15,
    };
  }

  static async setSettings(settings: Partial<Settings>): Promise<void> {
    const currentSettings = await this.getSettings();
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { ...currentSettings, ...settings },
    });
  }

  static async getMetrics(): Promise<Metrics> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.METRICS);
    const today = getTodayISO();
    const weekRange = getWeekRange();

    let metrics = result[STORAGE_KEYS.METRICS];

    if (!metrics) {
      metrics = {
        daily: initializeDailyMetrics(today),
        weekly: initializeWeeklyMetrics(),
        lifetime: initializeLifetimeMetrics()
      };
    }

    if (metrics.daily.date !== today) {
      metrics.daily = initializeDailyMetrics(today);
    }

    if (metrics.weekly.startDate !== weekRange.startDate || metrics.weekly.endDate !== weekRange.endDate) {
      metrics.weekly = initializeWeeklyMetrics();
    }

    // Calculate derived metrics
    const totalDailyVideos = metrics.daily.learningVideosWatched + metrics.daily.distractingVideosDetected;
    const focusScore = totalDailyVideos > 0 
      ? Math.round((metrics.daily.learningVideosWatched / totalDailyVideos) * 100)
      : 0;
    metrics.daily.focusScore = focusScore;

    // Goal completion (we can enhance this later to use actual user goals)
    const targetFocusMinutes = 60; // Example daily target
    metrics.daily.goalCompletionPercentage = Math.min(100, Math.round((metrics.daily.focusMinutes / targetFocusMinutes) * 100));

    return metrics;
  }

  static async setMetrics(metrics: Partial<Metrics>): Promise<void> {
    const currentMetrics = await this.getMetrics();
    const updatedMetrics: Metrics = {
      ...currentMetrics,
      ...metrics,
      daily: { ...currentMetrics.daily, ...metrics.daily },
      weekly: { ...currentMetrics.weekly, ...metrics.weekly },
      lifetime: { ...currentMetrics.lifetime, ...metrics.lifetime }
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.METRICS]: updatedMetrics });
  }
}
