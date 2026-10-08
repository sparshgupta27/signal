import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a fully client-driven SPA-style experience (mock auth,
  // TanStack Query + Zustand client state) — every route under (app) is
  // inherently dynamic, so the experimental static-shell prerendering
  // this flag enables has nothing to cache and only adds friction.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
