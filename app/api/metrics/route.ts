import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, apiError, apiSuccess } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import WatchHistory from '@/models/WatchHistory';
import Goal from '@/models/Goal';
import Prediction from '@/models/Prediction';
import SkipHistory from '@/models/SkipHistory';
import IgnoredRecommendation from '@/models/IgnoredRecommendation';
import { getAIAnalytics } from '../../../lib/services/ai';

// GET /api/metrics - Get dashboard metrics
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    // Get today's date range (start and end of today)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Get start of week (Monday)
    const dayOfWeek = startOfToday.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // 1. Total watch time (in seconds)
    const totalWatchTimeResult = await WatchHistory.aggregate([
      { $match: { clerkId: user.clerkId } },
      { $group: { _id: null, total: { $sum: '$watchTime' } } }
    ]);
    const totalWatchTime = totalWatchTimeResult[0]?.total || 0;

    // 2. Today's watch time
    const todayWatchTimeResult = await WatchHistory.aggregate([
      { $match: { clerkId: user.clerkId, watchedAt: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$watchTime' } } }
    ]);
    const todayWatchTime = todayWatchTimeResult[0]?.total || 0;

    // 3. This week's watch time
    const weekWatchTimeResult = await WatchHistory.aggregate([
      { $match: { clerkId: user.clerkId, watchedAt: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$watchTime' } } }
    ]);
    const weekWatchTime = weekWatchTimeResult[0]?.total || 0;

    // 4. Total videos watched
    const totalVideos = await WatchHistory.countDocuments({ clerkId: user.clerkId });

    // 5. Today's videos watched
    const todayVideos = await WatchHistory.countDocuments({
      clerkId: user.clerkId,
      watchedAt: { $gte: startOfToday, $lt: endOfToday }
    });

    // Get today's watch history with predictions for accurate classification
    const todayWatchHistory = await WatchHistory.find({
      clerkId: user.clerkId,
      watchedAt: { $gte: startOfToday, $lt: endOfToday }
    }).lean();

    // Link predictions to today's watch history using videoId
    const todayVideoIds = todayWatchHistory
      .filter((item: any) => item.videoId)
      .map((item: any) => item.videoId);
    
    const todayPredictions = todayVideoIds.length > 0
      ? await Prediction.find({
          clerkId: user.clerkId,
          videoId: { $in: todayVideoIds },
          expiredAt: { $gt: new Date() }
        }).lean()
      : [];
    
    const predictionsByVideoId = new Map(todayPredictions.map((p: any) => [p.videoId, p]));

    // Classify today's videos based on predictions
    let todayLearningVideos = 0;
    let todayDistractingVideos = 0;
    
    todayWatchHistory.forEach((item: any) => {
      const prediction = item.predictionId || predictionsByVideoId.get(item.videoId);
      if (prediction) {
        if (prediction.prediction === 'ALIGNED') {
          todayLearningVideos++;
        } else if (prediction.prediction === 'DISTRACTING') {
          todayDistractingVideos++;
        }
      }
    });

    const [todaySkippedVideos, todayStillProceededVideos] = await Promise.all([
      SkipHistory.countDocuments({
        clerkId: user.clerkId,
        timestamp: { $gte: startOfToday, $lt: endOfToday }
      }),
      IgnoredRecommendation.countDocuments({
        clerkId: user.clerkId,
        timestamp: { $gte: startOfToday, $lt: endOfToday }
      })
    ]);

    // Get this week's watch history with predictions for accurate classification
    const weekWatchHistory = await WatchHistory.find({
      clerkId: user.clerkId,
      watchedAt: { $gte: startOfWeek }
    }).lean();

    // Link predictions to week's watch history using videoId
    const weekVideoIds = weekWatchHistory
      .filter((item: any) => item.videoId)
      .map((item: any) => item.videoId);
    
    const weekPredictions = weekVideoIds.length > 0
      ? await Prediction.find({
          clerkId: user.clerkId,
          videoId: { $in: weekVideoIds },
          expiredAt: { $gt: new Date() }
        }).lean()
      : [];
    
    const predictionsByVideoIdWeek = new Map(weekPredictions.map((p: any) => [p.videoId, p]));

    // Classify week's videos based on predictions
    let weekLearningVideos = 0;
    let weekDistractingVideos = 0;
    
    weekWatchHistory.forEach((item: any) => {
      const prediction = item.predictionId || predictionsByVideoIdWeek.get(item.videoId);
      if (prediction) {
        if (prediction.prediction === 'ALIGNED') {
          weekLearningVideos++;
        } else if (prediction.prediction === 'DISTRACTING') {
          weekDistractingVideos++;
        }
      }
    });

    const [weekSkippedVideos, weekStillProceededVideos] = await Promise.all([
      SkipHistory.countDocuments({
        clerkId: user.clerkId,
        timestamp: { $gte: startOfWeek }
      }),
      IgnoredRecommendation.countDocuments({
        clerkId: user.clerkId,
        timestamp: { $gte: startOfWeek }
      })
    ]);

    // 6. Get active goal
    const activeGoal = await Goal.findOne({ clerkId: user.clerkId, isActive: true });

    // 7. Calculate streak (simple version: consecutive days with at least one video watched)
    const allWatchDates = await WatchHistory.aggregate([
      { $match: { clerkId: user.clerkId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$watchedAt' } } } },
      { $sort: { _id: -1 } }
    ]);
    
    let streak = 0;
    let checkDate = new Date(startOfToday);
    for (let i = 0; i < allWatchDates.length; i++) {
      const dateStr = allWatchDates[i]._id;
      const watchDate = new Date(dateStr);
      watchDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(checkDate);
      expectedDate.setDate(expectedDate.getDate() - streak);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (watchDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (watchDate < expectedDate) {
        break;
      }
    }

    // 8. Focus score: productive choices and skipped distractions are positive;
    // distractions the user continued watching reduce the score.
    // Only calculate score if there were actual decisions made today
    const videoDecisions = todayLearningVideos + todaySkippedVideos + todayStillProceededVideos;
    const focusScore = videoDecisions > 0
      ? Math.round(((todayLearningVideos + todaySkippedVideos) / videoDecisions) * 100)
      : 0;

    // 9. Get AI analytics
    const aiAnalytics = await getAIAnalytics(user.clerkId, user._id.toString());

    // 10. Get top productive channels
    const topChannels = await WatchHistory.aggregate([
      { 
        $match: { 
          clerkId: user.clerkId, 
          watchedAt: { $gte: startOfWeek } 
        } 
      },
      { 
        $group: { 
          _id: '$channel', 
          totalTime: { $sum: '$watchTime' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { totalTime: -1 } },
      { $limit: 10 }
    ]);

    // 11. Recent videos
    const recentVideos = await WatchHistory.find({ clerkId: user.clerkId })
      .sort({ watchedAt: -1 })
      .limit(10);

    return apiSuccess({
      totalWatchTime,
      todayWatchTime,
      weekWatchTime,
      totalVideos,
      todayVideos,
      todayLearningVideos,
      todaySkippedVideos,
      todayStillProceededVideos,
      weekLearningVideos,
      weekSkippedVideos,
      weekStillProceededVideos,
      streak,
      focusScore,
      activeGoal: activeGoal ? {
        _id: activeGoal._id,
        title: activeGoal.title,
        description: activeGoal.description
      } : null,
      aiAnalytics,
      topChannels,
      recentVideos
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return apiError('Internal server error', 500);
  }
}
