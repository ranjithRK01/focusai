import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from './mongodb';
import User from '@/models/User';
import type { User as UserType } from '@/types/user';

/**
 * Authenticate an API request and return the MongoDB user
 */
export async function authenticateApiRequest(): Promise<UserType | null> {
  const { userId } = auth();
  if (!userId) {
    return null;
  }

  try {
    await connectDB();
    const user = await User.findOne({ clerkId: userId });
    return user as UserType | null;
  } catch (error) {
    console.error('Error authenticating API request:', error);
    return null;
  }
}

/**
 * Create an error API response
 */
export function apiError(message: string, statusCode = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status: statusCode }
  );
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T) {
  return NextResponse.json(
    { success: true, data },
    { status: 200 }
  );
}