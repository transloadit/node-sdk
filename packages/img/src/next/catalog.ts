import type { StorageImageCatalog } from './layout.ts'
import type { ImageConfiguration } from './server.tsx'

/** Nonsecret transport overrides for a trusted Storage endpoint. */
export type StorageImageDelivery = Pick<ImageConfiguration, 'baseUrl' | 'urlParams'>

/** The CLI's committed project identity, public policy and original image geometry. */
export interface StorageProjectCatalog {
  workspace: string
  public: readonly string[]
  images: StorageImageCatalog
  delivery?: StorageImageDelivery
}

// The plugin replaces this module with the project's JSON. Keep import itself harmless so
// explicitly configured factories and model-only renderers do not require the plugin.
const catalog: StorageProjectCatalog | undefined = undefined
export default catalog
