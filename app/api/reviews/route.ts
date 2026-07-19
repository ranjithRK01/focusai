import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, apiError, apiSuccess } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
import WatchHistory from '@/models/WatchHistory';
import type { Review as ReviewType, WatchHistory as WatchHistoryType } from '@/types';

// GET /api/reviews - Get videos to review or user's reviews
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'pending';

    if (mode === 'pending') {
      // Get today's videos for daily rewind (regardless of review status)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all watch history from today for the daily rewind experience
      const todayVideos = await WatchHistory.find({
        clerkId: user.clerkId,
        watchedAt: { $gte: today, $lt: tomorrow },
      }).sort({ watchedAt: -1 });

      return apiSuccess<WatchHistoryType[]>(todayVideos as WatchHistoryType[]);
    } else {
      // Get user's completed reviews
      const reviews = await Review.find({ clerkId: user.clerkId })
        .populate('watchHistoryId')
        .sort({ reviewedAt: -1 });

      return apiSuccess<ReviewType[]>(reviews as ReviewType[]);
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return apiError('Internal server error', 500);
  }
}

// POST /api/reviews - Submit a review
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const { watchHistoryId, label, aiAnalysisId } = await req.json();

    if (!watchHistoryId || !label) {
      return apiError('Missing required fields', 400);
    }

    await connectDB();

    // Check if already reviewed
    const existingReview = await Review.findOne({
      clerkId: user.clerkId,
      watchHistoryId,
    });

    if (existingReview) {
      return apiError('Already reviewed', 400);
    }

    // Create review
    const review = await Review.create({
      userId: user._id,
      clerkId: user.clerkId,
      watchHistoryId,
      label,
      aiAnalysisId,
      reviewedAt: new Date(),
    });

    return apiSuccess<ReviewType>(review as ReviewType);
  } catch (error) {
    console.error('Error submitting review:', error);
    return apiError('Internal server error', 500);
  }
}
