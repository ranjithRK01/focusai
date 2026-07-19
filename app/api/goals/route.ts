import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, apiError, apiSuccess } from '@/lib/api-helpers';
import connectDB from '@/lib/mongodb';
import Goal from '@/models/Goal';
import User from '@/models/User';
import type { Goal as GoalType } from '@/types';

// GET /api/goals - Get user's goals (active first)
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();
    const goals = await Goal.find({ clerkId: user.clerkId }).sort({ isActive: -1, createdAt: -1 });
    return apiSuccess<GoalType[]>(goals as GoalType[]);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return apiError('Internal server error', 500);
  }
}

// POST /api/goals - Create a new goal (sets as active)
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateApiRequest();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const { title, description } = await req.json();

    if (!title) {
      return apiError('Goal title is required', 400);
    }

    await connectDB();

    // Deactivate all existing goals for this user
    await Goal.updateMany(
      { clerkId: user.clerkId, isActive: true },
      { $set: { isActive: false } }
    );

    // Create new active goal
    const goal = await Goal.create({
      userId: user._id,
      clerkId: user.clerkId,
      title,
      description,
      isActive: true,
    });

    // Update user's active goal ID
    await User.findByIdAndUpdate(user._id, { goalId: goal._id });

    return apiSuccess<GoalType>(goal as GoalType);
  } catch (error) {
    console.error('Error creating goal:', error);
    return apiError('Internal server error', 500);
  }
}
