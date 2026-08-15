import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'better-sqlite3', 'sql.js'],
};

export default nextConfig;
