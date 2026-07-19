import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, apiError, apiSuccess } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import WatchHistory from '@/models/WatchHistory';
import Prediction from '@/models/Prediction';
import type { WatchHistory as WatchHistoryType } from '@/types';

// POST /api/watch - Handle watch events (start, progress, end)
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const { eventType, videoUrl, videoTitle, channelName, channelUrl, duration, watchedDuration, percentageWatched, watchHistoryId, videoId } = body;

    if (!eventType) {
      return apiError('Missing event type', 400);
    }

    await connectDB();
    let watchHistory: WatchHistoryType | null = null;

    if (eventType === 'start') {
      if (!videoUrl || !videoTitle || !channelName) {
        return apiError('Missing required fields for watch start', 400);
      }

      // Extract video ID from URL if not provided
      const extractedVideoId = videoId || (() => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
        const match = videoUrl.match(regex);
        return match ? match[1] : null;
      })();

      // Check if a similar watch history entry exists for the same day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingWatchHistory = await WatchHistory.findOne({
        clerkId: user.clerkId,
        $or: [
          { videoId: extractedVideoId },
          { url: videoUrl },
          { title: videoTitle, channel: channelName }
        ],
        watchedAt: { $gte: today, $lt: tomorrow },
      });

      if (existingWatchHistory) {
        // If an entry exists, update its watchedAt timestamp and return it
        existingWatchHistory.watchedAt = new Date();
        await existingWatchHistory.save();
        return apiSuccess<WatchHistoryType>(existingWatchHistory as WatchHistoryType);
      }

      // Start watching a new video
      watchHistory = await WatchHistory.create({
        userId: user._id,
        clerkId: user.clerkId,
        videoId: extractedVideoId,
        url: videoUrl,
        title: videoTitle,
        channel: channelName,
        duration,
        watchTime: watchedDuration || 0,
        percentage: percentageWatched || 0,
        watchedAt: new Date(),
      });
    } else if (eventType === 'progress' && watchHistoryId) {
      // Update progress on existing video
      watchHistory = await WatchHistory.findByIdAndUpdate(
        watchHistoryId,
        {
          $set: {
            watchTime: watchedDuration,
            percentage: percentageWatched,
          },
        },
        { new: true }
      );
    } else if (eventType === 'end' && watchHistoryId) {
      // End watching
      watchHistory = await WatchHistory.findByIdAndUpdate(
        watchHistoryId,
        {
          $set: {
            watchTime: watchedDuration,
            percentage: percentageWatched,
          },
        },
        { new: true }
      );
    } else {
      return apiError('Invalid event type or missing watchHistoryId', 400);
    }

    return apiSuccess<WatchHistoryType>(watchHistory as WatchHistoryType);
  } catch (error) {
    console.error('Error handling watch event:', error);
    return apiError('Internal server error', 500);
  }
}

// GET /api/watch - Get user's watch history
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    // Get query params for pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const watchHistory = await WatchHistory.find({ clerkId: user.clerkId })
      .sort({ watchedAt: -1 }) // Use watchedAt instead of startedAt!
      .skip(offset)
      .limit(limit)
      .populate('predictionId')
      .lean();

    // Link predictions to watch history using multiple strategies
    // Priority: videoId → URL → title+channel (for predictions with empty URLs)
    const itemsWithoutPredictions = watchHistory.filter((item: any) => !item.predictionId);
    
    let predictions: any[] = [];
    const predictionsByVideoId = new Map<string, any>();
    const predictionsByUrl = new Map<string, any>();
    const predictionsByTitleChannel = new Map<string, any>();

    if (itemsWithoutPredictions.length > 0) {
      // First, try to match by videoId (most accurate)
      const videoIds = itemsWithoutPredictions
        .filter((item: any) => item.videoId)
        .map((item: any) => item.videoId);
      
      if (videoIds.length > 0) {
        const predictionsById = await Prediction.find({
          clerkId: user.clerkId,
          videoId: { $in: videoIds }
        }).sort({ createdAt: -1 }).lean();
        
        predictionsById.forEach((prediction: any) => {
          if (prediction.videoId) {
            predictionsByVideoId.set(prediction.videoId, prediction);
          }
        });
      }

      // Second, try to match by URL (filter out empty URLs)
      const urls = itemsWithoutPredictions
        .filter((item: any) => !item.videoId && item.url && item.url.trim() !== '')
        .map((item: any) => item.url);
      
      if (urls.length > 0) {
        const predictionsByUrls = await Prediction.find({
          clerkId: user.clerkId,
          videoUrl: { $in: urls }
        }).sort({ createdAt: -1 }).lean();
        
        predictionsByUrls.forEach((prediction: any) => {
          if (prediction.videoUrl && prediction.videoUrl.trim() !== '') {
            predictionsByUrl.set(prediction.videoUrl, prediction);
          }
        });
      }

      // Third, match by title + channel (for predictions with empty URLs or no videoId)
      const titleChannelPairs = itemsWithoutPredictions
        .filter((item: any) => item.title && item.channel)
        .map((item: any) => ({ title: item.title, channel: item.channel }));
      
      if (titleChannelPairs.length > 0) {
        const predictionsByTitleChannels = await Prediction.find({
          clerkId: user.clerkId,
          $or: titleChannelPairs.map(pair => ({
            videoTitle: pair.title,
            videoChannel: pair.channel
          }))
        }).sort({ createdAt: -1 }).lean();
        
        predictionsByTitleChannels.forEach((prediction: any) => {
          const key = `${prediction.videoTitle}|${prediction.videoChannel}`;
          predictionsByTitleChannel.set(key, prediction);
        });
      }
    }

    const historyWithPredictions = watchHistory.map((item: any) => {
      let prediction = item.predictionId;
      
      if (!prediction && item.videoId) {
        prediction = predictionsByVideoId.get(item.videoId);
      }
      
      if (!prediction && item.url && item.url.trim() !== '') {
        prediction = predictionsByUrl.get(item.url);
      }
      
      if (!prediction && item.title && item.channel) {
        const key = `${item.title}|${item.channel}`;
        prediction = predictionsByTitleChannel.get(key);
      }
      
      return {
        ...item,
        predictionId: prediction
      };
    });

    // Filter out entries with Unknown title and Unknown channel
    const filteredHistory = historyWithPredictions.filter((item: any) => {
      const displayChannel = item.channel || item.predictionId?.videoChannel || 'Unknown';
      return !(item.title === 'Unknown' && displayChannel === 'Unknown');
    });

    const total = filteredHistory.length;

    return apiSuccess<{ history: any[]; total: number }>({
      history: filteredHistory,
      total,
    });
  } catch (error) {
    console.error('Error fetching watch history:', error);
    return apiError('Internal server error', 500);
  }
}
