import type { NextConfig } from 'next';

// 画像最適化(sharp)のネイティブ依存を避ける。
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
