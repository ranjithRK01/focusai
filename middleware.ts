import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/about', '/pricing', '/api/webhooks/clerk']);
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware((auth, request) => {
  // For API routes, don't redirect — let the route handle 401
  if (isApiRoute(request)) {
    return;
  }

  if (!isPublicRoute(request)) {
    const { userId } = auth();
    if (!userId) {
      return auth().redirectToSignIn();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy path
    '/__clerk/:path*',
  ],
};