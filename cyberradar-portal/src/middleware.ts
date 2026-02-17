// © 2025 CyberLage
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(_req: NextRequest) {
  // Öffentliche Version: keine Authentifizierung, keine Rollenprüfung.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)",
  ],
};
