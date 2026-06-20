import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // Match protected routes
  const protectedPaths = [
    "/dashboard",
    "/footprint",
    "/carbon-twin",
    "/simulator",
    "/eco-actions",
    "/progress",
  ];

  const isProtected = protectedPaths.some((path) => 
    nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
  );

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/footprint/:path*",
    "/carbon-twin/:path*",
    "/simulator/:path*",
    "/eco-actions/:path*",
    "/progress/:path*",
  ]
};
