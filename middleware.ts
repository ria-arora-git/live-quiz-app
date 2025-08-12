import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isIgnoredRoute = createRouteMatcher(["/api/socket"]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req) || isIgnoredRoute(req)) {
    return;
  }
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/quiz/:path*",
    "/api/:path*",
  ],
};
