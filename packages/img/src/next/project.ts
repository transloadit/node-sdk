import 'server-only'

import type { StorageImageCatalog } from './layout.ts'
import type { TransloaditImageIntegration, TransloaditRedirectImageIntegration } from './server.tsx'

import { authorize } from '@transloadit/viewer/next/authorize'
import catalog from '@transloadit/viewer/next/catalog'
import options from '@transloadit/viewer/next/options'
import { cache } from 'react'

import { diagnosePublicPolicy } from './diagnostics.ts'
import { createImages } from './server.tsx'

type ProjectIntegration =
  | TransloaditImageIntegration<StorageImageCatalog>
  | TransloaditRedirectImageIntegration<StorageImageCatalog>
let integration: ProjectIntegration | undefined

/** One integration per bundled project; credentials retain the factory's lazy server-only lookup. */
export function getProjectImages(workspace?: string): ProjectIntegration {
  if (catalog === undefined)
    throw new Error(
      'No bundled Storage catalog (transloadit.images.json). Run transloadit storage store to create it, and ensure withTransloaditImages() from @transloadit/viewer/next/config wraps next.config.ts. Restart next dev after creating the first catalog, or use createImages with an explicit catalog.',
    )
  const selectedWorkspace = workspace ?? options.workspace ?? catalog.workspace
  // A project default must not reinterpret a catalog. Use matching metadata or an explicit factory.
  if (selectedWorkspace !== catalog.workspace)
    throw new TypeError(
      `Storage workspace conflicts with catalog workspace ${JSON.stringify(catalog.workspace)}: received ${JSON.stringify(selectedWorkspace)}. Use matching metadata or an explicit factory for another workspace.`,
    )
  if (integration !== undefined) return integration
  diagnosePublicPolicy(catalog, options.diagnosticsId)
  integration = createImages({
    // Catalog writers preserve application metadata. Only these fields configure delivery.
    workspace: catalog.workspace,
    images: catalog.images,
    public: catalog.public,
    baseUrl: options.delivery?.baseUrl ?? catalog.delivery?.baseUrl,
    urlParams: options.delivery?.urlParams ?? catalog.delivery?.urlParams,
    authorize,
    ...(authorize === undefined ? {} : { basePath: options.basePath }),
  })
  return integration
}

/** Request-scoped reuse: caller-selected templates never accumulate in a process-global registry. */
// Development diagnostics are per integration too; bounded lifetime is preferable to retaining
// arbitrary template/path combinations merely to suppress warnings across requests.
export const getProjectTemplateImages = cache(
  (
    template: string,
    explicitWorkspace?: string,
  ): TransloaditImageIntegration | TransloaditRedirectImageIntegration => {
    const defaultWorkspace =
      options.workspace ?? catalog?.workspace ?? process.env.TRANSLOADIT_WORKSPACE
    const workspace = explicitWorkspace ?? defaultWorkspace
    if (defaultWorkspace !== undefined && workspace !== defaultWorkspace)
      throw new TypeError(
        'Signing credentials are bound to the configured workspace. Use createImages with explicit workspace credentials for a different workspace.',
      )
    return createImages({
      // Template inputs have their own metadata and publication policy, not the Storage catalog's.
      workspace,
      template,
      allowWorkspaceRoot: true,
      ...options.delivery,
      delivery: 'direct',
      authorize,
      ...(authorize === undefined ? {} : { basePath: options.basePath }),
    })
  },
)
