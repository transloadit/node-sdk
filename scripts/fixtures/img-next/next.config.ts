import type { NextConfig } from 'next'

import { withTransloaditImages } from '@transloadit/img/next/config'

const nextConfig: NextConfig = {
  basePath: '/fixture',
  // Keep the development badge out of consumer UI checks. Compile/runtime errors still surface.
  devIndicators: false,
  ...(process.env.IMG_FIXTURE_CACHE_COMPONENTS === 'enabled' ? { cacheComponents: true } : {}),
}

export default withTransloaditImages(nextConfig, {
  delivery: { baseUrl: `${process.env.IMG_FIXTURE_CDN_ORIGIN}/file/{workspace}` },
})
