import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Route protection middleware using Clerk Authentication.
 * Explicitly guards /dashboard and /api routes while allowing public access
 * to landing pages and authentication endpoints without deprecated matchers.
 */
export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/api')) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
