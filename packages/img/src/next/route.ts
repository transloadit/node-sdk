import 'server-only'

import { getProjectImages } from './project.ts'

/** Re-export at app/api/storage-images/route.ts; private requests always consult authorize. */
export async function GET(request: Request): Promise<Response> {
  const integration = getProjectImages()
  if (!('storageRoute' in integration) || typeof integration.storageRoute !== 'function')
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return await integration.storageRoute(request)
}

export { GET as HEAD }
