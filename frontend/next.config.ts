import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

const missingApiUrl =
  "NEXT_PUBLIC_API_URL is not set. Building without it ships a frontend that never reaches " +
  "the API: sync switches off silently and the app falls back to localStorage alone. Set it " +
  "to your own API origin — see frontend/README.md.";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactCompiler: true,
  turbopack: { root: import.meta.dirname },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_API_URL) {
    throw new Error(missingApiUrl);
  }

  return nextConfig;
}
