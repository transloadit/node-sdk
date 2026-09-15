import type { StorageImageDelivery } from './catalog.ts'

/** Build-time overrides; application keys always stay in the server environment. */
export interface StorageImageProjectOptions {
  /** Development-only path for explaining an authorizer added after config evaluation. */
  authorizePath?: string
  basePath?: string
  delivery?: StorageImageDelivery
  /** Development-only identity for deduplicated policy-change notices across hot reloads. */
  diagnosticsId?: string
}

const options: StorageImageProjectOptions = {}
export default options
