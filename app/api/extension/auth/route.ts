import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // In a real implementation, you'd generate a proper Clerk session token
    // For now, we'll redirect back with a placeholder
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('authenticated', 'true');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Extension auth error:', error);
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
}
