// © 2025 CyberLage
"use client";

import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  // Public version: no auth provider required.
  return children;
}

