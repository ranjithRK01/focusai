'use client';
import { useState, useEffect } from 'react';
import { requireUser } from '@/lib/server-helpers';
import type { WatchHistory } from '@/types';

interface DailyMetrics {
  todaySkippedVideos: number;
  todayLearningVideos: number;
  todayStillProceededVideos: number;
  weekSkippedVideos: number;
  weekLearningVideos: number;
  streak: number;
}

export default function ReviewsPage() {
  const [state, setState] = useState({
    pendingReviews: [] as WatchHistory[],
    reviewedToday: [] as WatchHistory[],
    currentIndex: 0,
    loading: true,
    submitting: false,
    showHeadline: true,
    showSummary: false,
    metrics: null as DailyMetrics | null
  });

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Fetch all data in parallel
        const [pendingRes, reviewedRes, metricsRes] = await Promise.all([
          fetch('/api/reviews?mode=pending'),
          fetch('/api/reviews?mode=completed'),
          fetch('/api/metrics')
        ]);

        // Process pending reviews
        let pendingData: WatchHistory[] = [];
        if (pendingRes.ok) {
          const pendingJson = await pendingRes.json();
          if (pendingJson.success) {
            pendingData = pendingJson.data;
          }
        }

        // Process reviewed today
        let reviewedData: WatchHistory[] = [];
        if (reviewedRes.ok) {
          const reviewedJson = await reviewedRes.json();
          if (reviewedJson.success) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            reviewedData = reviewedJson.data.filter((review: any) => 
              new Date(review.reviewedAt) >= today
            );
            
            // Filter out already-reviewed videos from pending
            const reviewedIds = reviewedData.map((review: any) => review.watchHistoryId?._id || review.watchHistoryId);
            pendingData = pendingData.filter(video => !reviewedIds.includes(video._id));
          }
        }

        // Process metrics
        let metricsData: DailyMetrics | null = null;
        if (metricsRes.ok) {
          const metricsJson = await metricsRes.json();
          if (metricsJson.success) {
            metricsData = {
              todaySkippedVideos: metricsJson.data.todaySkippedVideos,
              todayLearningVideos: metricsJson.data.todayLearningVideos,
              todayStillProceededVideos: metricsJson.data.todayStillProceededVideos,
              weekSkippedVideos: metricsJson.data.weekSkippedVideos,
              weekLearningVideos: metricsJson.data.weekLearningVideos,
              streak: metricsJson.data.streak,
            };
          }
        }

        // Set all state at once in a single update
        setState({
          pendingReviews: pendingData,
          reviewedToday: reviewedData,
          metrics: metricsData,
          loading: false,
          showSummary: reviewedData.length > 0 && pendingData.length === 0,
          showHeadline: !(reviewedData.length > 0 && pendingData.length === 0),
          currentIndex: 0,
          submitting: false
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadAllData();
  }, []);

  const submitReview = async (label: 'aligned' | 'off-track') => {
    const currentWatchHistory = state.pendingReviews[state.currentIndex];
    if (!currentWatchHistory) return;

    setState(prev => ({ ...prev, submitting: true }));
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchHistoryId: currentWatchHistory._id,
          label,
        }),
      });

      if (res.ok) {
        // Move to next review
        setState(prev => ({ 
          ...prev, 
          currentIndex: prev.currentIndex + 1,
          showSummary: prev.currentIndex + 1 >= prev.pendingReviews.length
        }));
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setState(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleStartReview = () => {
    setState(prev => ({ ...prev, showHeadline: false }));
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading your daily rewind...</div>
      </div>
    );
  }

  // Opening Headline Card - only show if there are videos to review
  if (state.showHeadline && state.metrics && state.pendingReviews.length > 0) {
    const timeSaved = state.metrics.todaySkippedVideos * 10;
    const isBestDay = state.metrics.streak >= 3;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-white text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-4xl font-bold mb-4">Daily Rewind</h1>
            <p className="text-xl opacity-90">Your focus story for today</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
            <div className="text-5xl font-bold mb-2">{timeSaved} mins</div>
            <div className="text-xl opacity-90 mb-4">of focus protected</div>
            <div className="text-lg opacity-75">
              That's enough time to finish {Math.floor(timeSaved / 30)} tutorials
            </div>
          </div>

          {isBestDay && (
            <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-4 mb-8">
              <div className="text-2xl mb-2">🔥</div>
              <div className="text-xl font-bold">This is your best focus day this month!</div>
            </div>
          )}

          <button
            onClick={handleStartReview}
            className="bg-white text-purple-700 font-bold py-4 px-8 rounded-full text-xl hover:bg-opacity-90 transition-all"
          >
            Start Review →
          </button>
        </div>
      </div>
    );
  }

  // Summary Screen
  if (state.showSummary && state.metrics) {
    const timeSaved = state.metrics.todaySkippedVideos * 10;
    const totalTimeWithoutFocusAI = (state.metrics.todayLearningVideos + state.metrics.todaySkippedVideos + state.metrics.todayStillProceededVideos) * 15; // avg 15 min per video
    const actualTime = state.metrics.todayLearningVideos * 15;
    const focusRate = totalTimeWithoutFocusAI > 0 ? Math.round((actualTime / totalTimeWithoutFocusAI) * 100) : 0;
    const videosReviewed = state.reviewedToday.length > 0 ? state.reviewedToday.length : state.pendingReviews.length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-white text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold mb-4">Daily Rewind Complete!</h1>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-3xl font-bold">{Math.round(totalTimeWithoutFocusAI / 60)} hrs</div>
                <div className="text-sm opacity-75">Without FocusAI</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{Math.round(actualTime / 60)} hrs</div>
                <div className="text-sm opacity-75">Actual focus time</div>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-6">
              <div className="text-5xl font-bold mb-2">{focusRate}%</div>
              <div className="text-xl opacity-90">Focus rate today</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-8">
            <div className="text-lg">
              You reviewed {videosReviewed} videos and saved {timeSaved} minutes of focus
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white text-emerald-700 font-bold py-4 px-8 rounded-full text-xl hover:bg-opacity-90 transition-all w-full"
            >
              Back to Dashboard
            </button>
            <button
              className="bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-opacity-30 transition-all w-full"
            >
              📸 Share Your Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty State - No activity today
  if (state.pendingReviews.length === 0 && state.reviewedToday.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-white text-center">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-3xl font-bold mb-2">No activity yet today</h2>
          <p className="text-xl opacity-90 mb-8">Go watch something and come back for your daily rewind!</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-white text-purple-700 font-bold py-4 px-8 rounded-full text-xl hover:bg-opacity-90 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentVideo = state.pendingReviews[state.currentIndex];
  const remaining = state.pendingReviews.length - state.currentIndex - 1;
  const progress = state.pendingReviews.length > 0 ? ((state.currentIndex + 1) / state.pendingReviews.length) * 100 : 0;

  // If no current video, don't render the card
  if (!currentVideo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="bg-white/10 backdrop-blur-sm rounded-full h-2 mb-6">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-white text-center mb-4">
          <div className="text-sm opacity-75">{remaining} more to go</div>
        </div>

        {/* Review Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{currentVideo.title}</h2>
            <p className="text-gray-600">{currentVideo.channel}</p>
            <p className="text-sm text-gray-400 mt-2">
              Watched on {new Date(currentVideo.watchedAt).toLocaleString()}
            </p>
          </div>

          <p className="text-xl font-medium text-center mb-8 text-gray-800">
            Was this worth your time?
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => submitReview('off-track')}
              disabled={state.submitting}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-6 py-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-2 border-2 border-red-200"
            >
              <span className="text-3xl">👎</span>
              <span>Not Worth It</span>
            </button>
            <button
              onClick={() => submitReview('aligned')}
              disabled={state.submitting}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-6 py-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-2 border-2 border-green-200"
            >
              <span className="text-3xl">👍</span>
              <span>Worth It</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
