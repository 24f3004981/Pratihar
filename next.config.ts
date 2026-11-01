import type { NextConfig } from "next";

const config: NextConfig = {
  // lets a production build run beside `next dev` without overwriting its .next folder
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // pdf-parse and the Mongo driver read files at runtime, so keep them out of the bundle
  serverExternalPackages: ["pdf-parse", "mongodb", "mongodb-memory-server", "pg"],
};

export default config;
