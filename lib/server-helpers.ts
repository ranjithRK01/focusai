import { auth, currentUser } from '@clerk/nextjs/server';
import connectDB from './mongodb';
import User from '@/models/User';
import { redirect } from 'next/navigation';

/**
 * Get the current Clerk user ID
 */
export async function getCurrentClerkUser() {
  const { userId } = auth();
  if (!userId) return null;
  return userId;
}

/**
 * Get the current MongoDB user, creating one if it doesn't exist
 */
export async function getCurrentUser() {
  const clerkId = await getCurrentClerkUser();
  if (!clerkId) return null;
  
  try {
    await connectDB();
    
    // Check if user exists in DB
    let user = await User.findOne({ clerkId });
    
    // If not, try to create a new user using currentUser()
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        if (email) {
          user = await User.create({
            clerkId,
            email,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
          });
        }
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error getting/creating current user:', error);
    return null;
  }
}

/**
 * Require an authenticated Clerk user (redirects to sign-in if not authenticated)
 * Note: Does NOT require MongoDB user to exist to avoid redirect loops
 */
export async function requireUser() {
  const clerkId = await getCurrentClerkUser();
  if (!clerkId) {
    redirect('/sign-in');
  }
  
  // Try to get MongoDB user, but don't fail if it doesn't exist
  const user = await getCurrentUser();
  return user;
}