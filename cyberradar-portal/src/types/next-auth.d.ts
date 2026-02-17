// © 2025 CyberLage
import { DefaultSession } from "next-auth";
import type { PortalUserRole } from "./user";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: PortalUserRole;
      allowedTenants: string[];
    } & DefaultSession["user"];
  }

  interface User {
    userId?: string;
    role?: PortalUserRole;
    allowedTenants?: string[];
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: PortalUserRole;
    allowedTenants?: string[];
    tokenVersion?: number;
  }
}

