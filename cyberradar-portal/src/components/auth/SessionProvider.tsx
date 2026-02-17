// © 2025 CyberLage
"use client";

import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  // Öffentliche Version: kein Auth-Provider notwendig.
  return children;
}
