import type { StorageImageDelivery } from './catalog.ts'

/** Build-time overrides; application keys always stay in the server environment. */
export interface StorageImageProjectOptions {
  basePath?: string
  delivery?: StorageImageDelivery
}

const options: StorageImageProjectOptions = {}
export default options
