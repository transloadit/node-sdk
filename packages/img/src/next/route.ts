import 'server-only'

import catalog from '@transloadit/viewer/next/catalog'
import options from '@transloadit/viewer/next/options'

import { getProjectImages, getProjectTemplateImages } from './project.ts'
import { isImageSourceSelector } from './source.ts'

/** Re-export at app/api/storage-images/route.ts; private requests always consult authorize. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const templates = url.searchParams.getAll('template')
  const workspaces = url.searchParams.getAll('workspace')
  const workspace = workspaces[0]
  const template = templates[0]
  const defaultWorkspace =
    options.workspace ?? catalog?.workspace ?? process.env.TRANSLOADIT_WORKSPACE
  if (
    templates.length > 1 ||
    workspaces.length > 1 ||
    (template === undefined) !== (workspace === undefined) ||
    (template !== undefined && !isImageSourceSelector(template)) ||
    (workspace !== undefined && !isImageSourceSelector(workspace)) ||
    (workspace !== undefined && defaultWorkspace !== undefined && workspace !== defaultWorkspace) ||
    (template === undefined && catalog === undefined)
  )
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  const integration =
    template === undefined ? getProjectImages() : getProjectTemplateImages(template, workspace)
  if (!('imageRoute' in integration) || typeof integration.imageRoute !== 'function')
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  return await integration.imageRoute(request)
}

export { GET as HEAD }
