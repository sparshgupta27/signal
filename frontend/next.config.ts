import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a fully client-driven SPA-style experience (real auth
  // against the backend, TanStack Query + Zustand client state) — every
  // route under (app) is inherently dynamic, so the experimental
  // static-shell prerendering this flag enables has nothing to cache and
  // only adds friction.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Deliberately not a strict Content-Security-Policy here: the
    // pre-hydration theme-init script (app/layout.tsx) is inline, and
    // locking that down correctly needs a nonce wired through middleware —
    // a real follow-up, not a header to half-do. These are the safe,
    // no-tradeoff ones.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera=(self): the in-chat camera-capture feature needs it for
          // this origin. No feature uses the mic or geolocation yet, so
          // those stay locked down.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
