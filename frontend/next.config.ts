import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// skupni .env v korenu repozitorija, obstoječih spremenljivk ne prepiše
const rootEnvFile = path.resolve(process.cwd(), "..", ".env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
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
