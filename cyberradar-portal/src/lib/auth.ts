// © 2025 CyberLage
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { NextAuthConfig } from "next-auth";
import type { PortalUserRole } from "@/types/user";
import { verifyPassword } from "@/lib/password";
import {
  getDomainMapping,
  getUserByEmail,
  logAuthAudit,
  recordFailedLogin,
  recordSuccessfulLogin,
  upsertSsoUser,
} from "@/lib/auth-store";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV !== "production") return "dev-insecure-secret";
  return requireEnv("NEXTAUTH_SECRET");
}

function getRequestMetadata(req?: Request): { ipAddress: string | null; userAgent: string | null } {
  if (!req) return { ipAddress: null, userAgent: null };
  const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-client-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

function normalizeAllowedTenants(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const list = value.map(v => String(v || "").trim()).filter(Boolean);
  return Array.from(new Set(list));
}

function isRole(value: unknown): value is PortalUserRole {
  return value === "admin" || value === "manager" || value === "viewer";
}

const authConfig: NextAuthConfig = {
  secret: getSecret(),
  trustHost: true,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = String(credentials?.email || "").trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        const { ipAddress, userAgent } = getRequestMetadata(req);

        if (!user || !user.isActive) {
          // Avoid leaking whether an account exists.
          return null;
        }

        if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
          await logAuthAudit({
            userId: user.id,
            action: "login",
            tenantId: null,
            details: "credentials: account locked",
            ipAddress,
            userAgent,
            success: false,
          });
          return null;
        }

        if (user.authMethod !== "credentials" || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await recordFailedLogin(user.id);
          await logAuthAudit({
            userId: user.id,
            action: "login",
            tenantId: null,
            details: "credentials: wrong password",
            ipAddress,
            userAgent,
            success: false,
          });
          return null;
        }

        await recordSuccessfulLogin(user.id);
        await logAuthAudit({
          userId: user.id,
          action: "login",
          tenantId: null,
          details: "credentials: success",
          ipAddress,
          userAgent,
          success: true,
        });

        return {
          id: user.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          allowedTenants: user.allowedTenants || [],
          tokenVersion: user.tokenVersion || 0,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "microsoft-entra-id") return true;

      const email = String(user?.email || "").trim();
      if (!email || !email.includes("@")) return "/auth/unauthorized?reason=missing_email";

      const domain = email.split("@")[1]?.toLowerCase() || "";
      const mapping = await getDomainMapping(domain);
      const { ipAddress, userAgent } = getRequestMetadata();

      if (!mapping || !mapping.isActive) {
        return "/auth/unauthorized?reason=domain_not_registered";
      }

      if (mapping.autoProvision) {
        await upsertSsoUser({ email, name: user.name }, mapping);
      } else {
        const existing = await getUserByEmail(email);
        if (!existing || !existing.isActive) return "/auth/unauthorized?reason=user_not_provisioned";
      }

      const dbUser = await getUserByEmail(email);
      if (dbUser) {
        await logAuthAudit({
          userId: dbUser.id,
          action: "login",
          tenantId: null,
          details: "sso: success",
          ipAddress,
          userAgent,
          success: true,
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.userId || user.id;
        token.role = user.role;
        token.allowedTenants = normalizeAllowedTenants((user as any).allowedTenants);
        token.tokenVersion = typeof (user as any).tokenVersion === "number" ? (user as any).tokenVersion : 0;
        return token;
      }

      // Enrich SSO token on the first request after login.
      if (token?.email && (!isRole(token.role) || !token.userId)) {
        const dbUser = await getUserByEmail(String(token.email));
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.allowedTenants = dbUser.allowedTenants || [];
          token.tokenVersion = dbUser.tokenVersion || 0;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.userId = String(token.userId || "");
      session.user.role = isRole(token.role) ? token.role : "viewer";
      session.user.allowedTenants = normalizeAllowedTenants(token.allowedTenants as any);
      return session;
    },
  },
};

// Enable Entra ID SSO only when configured.
if (process.env.AUTH_ENTRA_CLIENT_ID && process.env.AUTH_ENTRA_CLIENT_SECRET) {
  authConfig.providers?.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_ENTRA_CLIENT_ID,
      clientSecret: process.env.AUTH_ENTRA_CLIENT_SECRET,
      issuer: process.env.AUTH_ENTRA_ISSUER || "https://login.microsoftonline.com/common/v2.0",
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);



