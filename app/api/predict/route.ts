import { NextResponse, NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { predictVideoAlignment, recordSkip, recordIgnoredRecommendation } from '../../../lib/services/ai';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get MongoDB user
    await connectDB();
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
    
    let user = await User.findOne({ clerkId: userId });
    if (!user && primaryEmail) {
      // Create user if not exists (shouldn't happen, but just in case)
      user = await User.create({
        clerkId: userId,
        email: primaryEmail,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        imageUrl: clerkUser?.imageUrl
      });
    }

    const body = await request.json();
    const { title, channel, url, thumbnail, action } = body;

    if (action === 'skip') {
      const { predictionId, predictionReason } = body;
      const skip = await recordSkip(
        userId,
        user._id.toString(),
        title,
        channel,
        url,
        'User chose to skip',
        predictionId,
        predictionReason
      );
      return NextResponse.json({
        success: true,
        data: skip
      });
    }

    if (action === 'ignore') {
      const { predictionId } = body;
      const ignored = await recordIgnoredRecommendation(
        userId,
        user._id.toString(),
        predictionId,
        title,
        channel,
        url
      );
      return NextResponse.json({
        success: true,
        data: ignored
      });
    }

    // Regular prediction
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    console.log('🔮 Making prediction for:', { title, channel });
    const prediction = await predictVideoAlignment(
      title,
      channel,
      url,
      thumbnail,
      userId,
      user._id.toString()
    );
    console.log('🔮 Prediction result:', prediction);

    // Also fetch the latest prediction document so we can get its ID for future actions
    // Get prediction from DB
    const predictionDoc = await (await import('../../../models/Prediction')).default.findOne({
      clerkId: userId,
      videoTitle: title,
      videoChannel: channel,
      expiredAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: {
        ...prediction,
        _id: predictionDoc?._id
      }
    });
  } catch (error) {
    console.error('Error in prediction API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const channel = searchParams.get('channel') || '';
    const url = searchParams.get('url') || '';
    const thumbnail = searchParams.get('thumbnail') || null;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get MongoDB user
    await connectDB();
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
    
    let user = await User.findOne({ clerkId: userId });
    if (!user && primaryEmail) {
      user = await User.create({
        clerkId: userId,
        email: primaryEmail,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        imageUrl: clerkUser?.imageUrl
      });
    }

    const prediction = await predictVideoAlignment(
      title,
      channel,
      url,
      thumbnail,
      userId,
      user._id.toString()
    );

    const predictionDoc = await (await import('../../../models/Prediction')).default.findOne({
      clerkId: userId,
      videoTitle: title,
      videoChannel: channel,
      expiredAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: {
        ...prediction,
        _id: predictionDoc?._id
      }
    });
  } catch (error) {
    console.error('Error in prediction API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
