import { StorageService } from './storage';
import type { Video, WatchEvent } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiService {
  private static async getHeaders(): Promise<HeadersInit> {
    const token = await StorageService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await StorageService.removeToken();
        await StorageService.removeUser();
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  static async sendWatchEvent(event: WatchEvent) {
    return this.request('/api/watch', {
      method: 'POST',
      body: JSON.stringify({
        eventType: event.type,
        videoUrl: event.video.url,
        videoTitle: event.video.title,
        channelName: event.video.channel.name,
        channelUrl: event.video.channel.url,
        duration: event.video.duration,
        watchedDuration: event.video.watchedDuration,
        percentageWatched: event.video.percentageWatched,
        watchHistoryId: event.watchHistoryId,
      }),
    });
  }

  static async getPredictions(video: Video) {
    const params = new URLSearchParams({
      title: video.title,
      channel: video.channel.name,
      url: video.url,
    });
    return this.request(`/api/predict?${params.toString()}`);
  }

  static async getTodayReviews() {
    return this.request('/api/reviews?mode=pending');
  }

  static async submitReview(watchHistoryId: string, label: 'aligned' | 'off-track') {
    return this.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ watchHistoryId, label }),
    });
  }

  static async getUserGoals() {
    return this.request('/api/goals');
  }
}
