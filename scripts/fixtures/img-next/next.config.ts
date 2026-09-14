import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/fixture',
  // Test consumer UI without the development badge's unrelated font requests. Errors still surface.
  devIndicators: false,
  ...(process.env.IMG_FIXTURE_CACHE_COMPONENTS === 'enabled' ? { cacheComponents: true } : {}),
}

export default nextConfig
