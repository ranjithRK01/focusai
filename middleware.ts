import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/about', '/pricing', '/api/webhooks/clerk']);
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware((auth, request) => {
  // For API routes (except webhooks), don't redirect - let the API route handle 401
  // But still ensure auth context is set up by the middleware
  if (isApiRoute(request) && !request.nextUrl.pathname.startsWith('/api/webhooks')) {
    // Don't call protect(), just let the middleware complete normally
    // The middleware will still set up auth context
  } else if (!isPublicRoute(request)) {
    // For non-API routes, protect and redirect if needed
    auth().protect();
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