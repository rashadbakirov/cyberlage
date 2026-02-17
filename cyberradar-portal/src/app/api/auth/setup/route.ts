// © 2025 CyberLage
import { NextResponse } from "next/server";
import { createUser, countUsers } from "@/lib/auth-store";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

export async function POST(req: Request) {
  try {
    // Security: require setup token in production when configured
    const isProduction = process.env.NODE_ENV === "production";
    const setupToken = process.env.SETUP_TOKEN;
    
    if (isProduction && setupToken) {
      const authHeader = req.headers.get("x-setup-token");
      if (authHeader !== setupToken) {
        return NextResponse.json(
          { error: "Unauthorized. Setup token is missing or invalid." },
          { status: 401 }
        );
      }
    }
    
    // Allow setup only if no users exist yet
    const userCount = await countUsers();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Setup is already complete. Users already exist." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Validate password policy
    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.ok) {
      return NextResponse.json(
        { error: policyCheck.errors.join(", ") },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const user = await createUser({
      name,
      email,
      role: "admin",
      allowedTenants: [], // Tenant logic disabled in public version
      authMethod: "credentials",
      passwordHash,
      passwordHistory: [passwordHash],
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "Admin account created successfully",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Admin account could not be created" },
      { status: 500 }
    );
  }
}



