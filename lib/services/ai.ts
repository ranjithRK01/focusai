import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '../mongodb';
import WatchHistory from '../../models/WatchHistory';
import Review from '../../models/Review';
import SkipHistory from '../../models/SkipHistory';
import Goal from '../../models/Goal';
import Prediction, { PredictionResult, Category } from '../../models/Prediction';
import FocusMetric from '../../models/FocusMetric';
import IgnoredRecommendation from '../../models/IgnoredRecommendation';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDqh7ZcJ3kDDYbN6Z_5zqEukC3-aodP9Xk';

interface UserProfile {
  goal: string;
  goalKeywords: string[];
  productiveChannels: string[];
  productiveTopics: string[];
  distractingChannels: string[];
  distractingTopics: string[];
  recentWatched: Array<{ title: string; channel: string }>;
  recentReviews: Array<{ label: string; title: string }>;
  recentSkipped: Array<{ title: string; channel: string }>;
}

interface PredictionOutput {
  decision: 'ALIGNED' | 'DISTRACTING';
  confidence: number;
  detectedTopic: string;
  detectedCategory: string;
  reason: string;
  goalSnapshot: string;
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const classifyObviousEntertainment = (title: string, channel: string): PredictionOutput | null => {
  const text = `${title} ${channel}`.toLowerCase();
  const entertainmentPattern = /\b(movie|film|trailer|teaser|scene|song|music|lyrics|comedy|funny|prank|gaming|gameplay|cricket|football|highlights|vlog|reality show|episode|kgf|yash|homable films)\b/;

  if (!entertainmentPattern.test(text)) return null;

  return {
    decision: 'DISTRACTING',
    confidence: 95,
    detectedTopic: 'Entertainment',
    detectedCategory: 'Entertainment',
    reason: 'This looks like entertainment, not goal-focused learning.',
    goalSnapshot: ''
  };
};

/**
 * Generate compact user profile for AI prediction
 */
export const generateUserProfile = async (clerkId: string, userId: string): Promise<UserProfile> => {
  await connectDB();

  // Get active goal
  const activeGoal = await Goal.findOne({ clerkId, isActive: true });
  const goal = activeGoal?.title || 'No specific goal set';
  const goalKeywords = goal.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

  // Get last 50 watched videos
  const [recentWatched, recentReviews, recentSkipped] = await Promise.all([
    WatchHistory.find({ clerkId }).sort({ watchedAt: -1 }).limit(50),
    Review.find({ clerkId }).sort({ createdAt: -1 }).limit(20).populate('watchHistoryId'),
    SkipHistory.find({ clerkId }).sort({ timestamp: -1 }).limit(20)
  ]);

  // Calculate top topics/channels
  const channelCounts: Record<string, number> = {};
  const reviewTopics: string[] = [];
  
  for (const review of recentReviews) {
    const wh = review.watchHistoryId as any;
    if (wh) {
      if (review.label === 'aligned') {
        if (wh.channel) {
          channelCounts[wh.channel] = (channelCounts[wh.channel] || 0) + 1;
        }
      }
    }
  }

  const productiveChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([channel]) => channel);

  const distractingChannels = recentSkipped
    .map(s => s.videoChannel)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10);

  return {
    goal,
    goalKeywords,
    productiveChannels,
    productiveTopics: [],
    distractingChannels,
    distractingTopics: [],
    recentWatched: recentWatched.map(w => ({ title: w.title, channel: w.channel })),
    recentReviews: recentReviews.map(r => {
      const wh = r.watchHistoryId as any;
      return { label: r.label, title: wh?.title || '' };
    }),
    recentSkipped: recentSkipped.map(s => ({ title: s.videoTitle, channel: s.videoChannel }))
  };
};

/**
 * Predict video alignment using Gemini 2.5 Flash with compact profile
 */
export const predictVideoAlignment = async (
  videoTitle: string,
  videoChannel: string,
  videoUrl: string,
  thumbnail: string | null,
  clerkId: string,
  userId: string
): Promise<PredictionOutput & { _id: string }> => {
  await connectDB();

  const videoId = extractVideoId(videoUrl);

  // Get active goal for cache key
  const activeGoal = await Goal.findOne({ clerkId, isActive: true });
  const goalId = activeGoal?._id?.toString() || 'default';

  // Check cache first by video ID + goal ID to avoid flip-flopping when goals change
  if (videoId) {
    const cachedPrediction = await Prediction.findOne({
      clerkId,
      videoId,
      goalSnapshot: activeGoal?.title || 'No specific goal set',
      expiredAt: { $gt: new Date() }
    });
    if (cachedPrediction && !classifyObviousEntertainment(videoTitle, videoChannel)) {
      return {
        decision: cachedPrediction.prediction === 'UNKNOWN' ? 'ALIGNED' : (cachedPrediction.prediction as 'ALIGNED' | 'DISTRACTING'),
        confidence: cachedPrediction.confidence,
        detectedTopic: cachedPrediction.topics[0] || '',
        detectedCategory: cachedPrediction.category,
        reason: cachedPrediction.reason,
        goalSnapshot: cachedPrediction.goalSnapshot,
        _id: cachedPrediction._id.toString()
      };
    }
  }

  // Obvious entertainment does not need a slower model request.
  const obviousEntertainment = classifyObviousEntertainment(videoTitle, videoChannel);
  if (obviousEntertainment) {
    const activeGoal = await Goal.findOne({ clerkId, isActive: true });
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30);
    const prediction = await Prediction.create({
      userId: userId as any,
      clerkId,
      videoId,
      videoTitle,
      videoChannel,
      videoUrl,
      videoThumbnail: thumbnail,
      prediction: obviousEntertainment.decision,
      confidence: obviousEntertainment.confidence,
      reason: obviousEntertainment.reason,
      topics: [obviousEntertainment.detectedTopic],
      category: 'distraction',
      goalSnapshot: activeGoal?.title || 'No specific goal set',
      expiredAt
    });
    return {
      ...obviousEntertainment,
      goalSnapshot: activeGoal?.title || 'No specific goal set',
      _id: prediction._id.toString()
    };
  }

  // Generate user profile
  const userProfile = await generateUserProfile(clerkId, userId);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI productivity coach. Decide if this video aligns with the user's goal. Use their history. Return ONLY JSON.

{
  "decision": "ALIGNED" or "DISTRACTING",
  "confidence": 0-100,
  "detectedTopic": "single short topic",
  "detectedCategory": "category",
  "reason": "max 15 words"
}

User Profile:
${JSON.stringify(userProfile)}

Video: Title="${videoTitle}", Channel="${videoChannel}"
`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    let predictionOutput: PredictionOutput;
    try {
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      predictionOutput = JSON.parse(jsonString);
    } catch (e) {
      predictionOutput = keywordBasedFallback(videoTitle, videoChannel, userProfile);
    }

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30);

    const prediction = await Prediction.create({
      userId: userId as any,
      clerkId,
      videoId,
      videoTitle,
      videoChannel,
      videoUrl,
      videoThumbnail: thumbnail,
      prediction: predictionOutput.decision,
      confidence: predictionOutput.confidence,
      reason: predictionOutput.reason,
      topics: [predictionOutput.detectedTopic],
      category: predictionOutput.decision === 'ALIGNED' ? 'productive' : 'distraction',
      goalSnapshot: userProfile.goal,
      userContextSnapshot: userProfile,
      expiredAt
    });

    return { ...predictionOutput, goalSnapshot: userProfile.goal, _id: prediction._id.toString() };
  } catch (error) {
    console.error('Gemini prediction failed:', error);
    const fallback = keywordBasedFallback(videoTitle, videoChannel, userProfile);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30);

    const prediction = await Prediction.create({
      userId: userId as any,
      clerkId,
      videoId,
      videoTitle,
      videoChannel,
      videoUrl,
      videoThumbnail: thumbnail,
      prediction: fallback.decision,
      confidence: fallback.confidence,
      reason: fallback.reason,
      topics: [fallback.detectedTopic],
      category: fallback.decision === 'ALIGNED' ? 'productive' : 'distraction',
      goalSnapshot: userProfile.goal,
      userContextSnapshot: userProfile,
      expiredAt
    });

    return { ...fallback, _id: prediction._id.toString() };
  }
};

const keywordBasedFallback = (title: string, channel: string, context: UserProfile): PredictionOutput => {
  const titleLower = title.toLowerCase();
  const distractionKeywords = ['football', 'movie', 'comedy', 'game', 'sports', 'meme', 'vlog', 'gaming'];
  const productiveKeywords = ['learn', 'tutorial', 'course', 'programming', 'ai', 'ml', 'python', 'javascript', 'react', 'design'];

  let decision: 'ALIGNED' | 'DISTRACTING' = 'ALIGNED';
  let reason = 'Looks relevant to your goal';
  let detectedTopic = title.split(' ')[0];
  let confidence = 50;

  if (distractionKeywords.some(k => titleLower.includes(k))) {
    decision = 'DISTRACTING';
    reason = 'Potential distraction content';
    confidence = 70;
  } else if (productiveKeywords.some(k => titleLower.includes(k))) {
    decision = 'ALIGNED';
    reason = 'Looks like productive learning';
    confidence = 70;
  }

  return {
    decision,
    confidence,
    detectedTopic,
    detectedCategory: decision === 'ALIGNED' ? 'Learning' : 'Entertainment',
    reason,
    goalSnapshot: context.goal
  };
};

export const recordSkip = async (
  clerkId: string,
  userId: string,
  videoTitle: string,
  videoChannel: string,
  videoUrl: string,
  reason: string,
  predictionId?: string,
  predictionReason?: string
) => {
  await connectDB();
  const videoId = extractVideoId(videoUrl);

  await SkipHistory.create({
    userId: userId as any,
    clerkId,
    videoId,
    videoTitle,
    videoChannel,
    videoUrl,
    reason,
    predictionId: predictionId ? (predictionId as any) : undefined,
    predictionReason,
    timestamp: new Date()
  });

  await FocusMetric.create({
    userId: userId as any,
    clerkId,
    type: 'skipped_distraction',
    score: 10,
    description: `Skipped ${videoTitle}`,
    timestamp: new Date()
  });
};

export const recordIgnoredRecommendation = async (
  clerkId: string,
  userId: string,
  predictionId: string,
  videoTitle: string,
  videoChannel: string,
  videoUrl: string
) => {
  await connectDB();

  await IgnoredRecommendation.create({
    userId: userId as any,
    clerkId,
    predictionId: predictionId as any,
    videoTitle,
    videoChannel,
    videoUrl,
    timestamp: new Date()
  });

  await FocusMetric.create({
    userId: userId as any,
    clerkId,
    type: 'ignored_warning',
    score: -3,
    description: `Ignored ${videoTitle} recommendation`,
    timestamp: new Date()
  });
};

export const getAIAnalytics = async (clerkId: string, userId: string) => {
  await connectDB();

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const predictions = await Prediction.find({ clerkId }).sort({ createdAt: -1 }).limit(100);
  const reviews = await Review.find({ clerkId }).sort({ createdAt: -1 }).limit(100);
  const skips = await SkipHistory.find({ clerkId }).sort({ timestamp: -1 }).limit(100);

  let correctPredictions = 0, totalPredictionsWithReviews = 0;

  for (const review of reviews) {
    const prediction = await Prediction.findOne({
      clerkId,
      watchHistoryId: review.watchHistoryId
    });
    if (prediction) {
      totalPredictionsWithReviews++;
      if (
        (review.label === 'aligned' && prediction.prediction === 'ALIGNED') ||
        (review.label === 'off-track' && prediction.prediction === 'DISTRACTING')
      ) correctPredictions++;
    }
  }

  // Productive channels: channels with most aligned predictions
  const productiveChannelsAgg = await Prediction.aggregate([
    { $match: { clerkId, prediction: 'ALIGNED', videoChannel: { $exists: true, $ne: '' } } },
    { $group: { _id: '$videoChannel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  const productiveChannels = productiveChannelsAgg.map((c: any) => c._id);

  // Distracting channels: channels with most distracting predictions
  const distractingChannelsAgg = await Prediction.aggregate([
    { $match: { clerkId, prediction: 'DISTRACTING', videoChannel: { $exists: true, $ne: '' } } },
    { $group: { _id: '$videoChannel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  const distractingChannels = distractingChannelsAgg.map((c: any) => c._id);

  const productiveTopics = predictions
    .filter(p => p.prediction === 'ALIGNED')
    .flatMap(p => p.topics)
    .filter(t => t)
    .slice(0, 10);

  const distractingTopics = predictions
    .filter(p => p.prediction === 'DISTRACTING')
    .flatMap(p => p.topics)
    .filter(t => t)
    .slice(0, 10);

  const accuracy = totalPredictionsWithReviews > 0 ? Math.round((correctPredictions / totalPredictionsWithReviews) * 100) : 0;

  // Weekly insights
  const weeklyPredictions = predictions.filter(p => new Date(p.createdAt) >= startOfWeek);
  const weeklySkippedThisWeek = skips.filter(s => new Date(s.timestamp) >= startOfWeek);

  return {
    totalPredictions: predictions.length,
    alignedPredictions: predictions.filter(p => p.prediction === 'ALIGNED').length,
    distractingPredictions: predictions.filter(p => p.prediction === 'DISTRACTING').length,
    skippedVideos: skips.length,
    skippedVideosThisWeek: weeklySkippedThisWeek.length,
    accuracy,
    productiveChannels,
    productiveTopics,
    distractingChannels,
    distractingTopics,
    weeklyInsights: {
      totalPredictionsThisWeek: weeklyPredictions.length,
      alignedPredictionsThisWeek: weeklyPredictions.filter(p => p.prediction === 'ALIGNED').length,
      distractingPredictionsThisWeek: weeklyPredictions.filter(p => p.prediction === 'DISTRACTING').length,
      skippedVideosThisWeek: weeklySkippedThisWeek.length
    }
  };
};
