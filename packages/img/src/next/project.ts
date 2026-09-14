import 'server-only'

import type { StorageImageCatalog } from './layout.ts'
import type { TransloaditImageIntegration, TransloaditRedirectImageIntegration } from './server.tsx'

import { authorize } from '@transloadit/img/next/authorize'
import catalog from '@transloadit/img/next/catalog'
import options from '@transloadit/img/next/options'

import { createStorageImages } from './server.tsx'

type ProjectIntegration =
  | TransloaditImageIntegration<StorageImageCatalog>
  | TransloaditRedirectImageIntegration<StorageImageCatalog>
let integration: ProjectIntegration | undefined

/** One integration per bundled project; credentials retain the factory's lazy server-only lookup. */
export function getProjectImages(): ProjectIntegration {
  if (catalog === undefined)
    throw new Error(
      'Add withTransloaditImages() from @transloadit/img/next/config to next.config.ts, or use createStorageImages with an explicit catalog.',
    )
  integration ??= createStorageImages({
    ...catalog,
    ...catalog.delivery,
    ...options.delivery,
    // The catalog's delivery object is transport, not the factory's private direct-delivery mode.
    delivery: undefined,
    authorize,
    ...(authorize === undefined ? {} : { basePath: options.basePath }),
  })
  return integration
}
