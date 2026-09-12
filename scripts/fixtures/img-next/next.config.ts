import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/fixture',
  ...(process.env.IMG_FIXTURE_CACHE_COMPONENTS === 'enabled' ? { cacheComponents: true } : {}),
}

export default nextConfig
