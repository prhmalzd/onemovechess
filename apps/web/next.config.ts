import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Stockfish selects its WASM file with a runtime path. Keep that package
  // external so Turbopack does not try to resolve its dynamic require().
  serverExternalPackages: ['stockfish'],
};

export default nextConfig;
