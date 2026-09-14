import type { StorageImageDelivery } from './catalog.ts'

/** Build-time overrides; application keys always stay in the server environment. */
export interface StorageImageProjectOptions {
  basePath?: string
  delivery?: StorageImageDelivery
  /** Development-only identity for deduplicated policy-change notices across hot reloads. */
  diagnosticsId?: string
}

const options: StorageImageProjectOptions = {}
export default options
