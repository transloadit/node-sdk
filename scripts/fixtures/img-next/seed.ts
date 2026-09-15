import type { StoredImageReceipt } from '@transloadit/node'

import { Transloadit } from '@transloadit/node'

/** Seed with an Assembly key, then save the receipt for rendering without another lookup. */
export function seedStorageImage(
  client: Transloadit,
  filePath: string,
  path: string,
): Promise<StoredImageReceipt> {
  return client.storeImage(filePath, { path })
}

async function main(): Promise<void> {
  const authKey = process.env.TRANSLOADIT_ASSEMBLY_KEY
  const authSecret = process.env.TRANSLOADIT_ASSEMBLY_SECRET
  const [filePath, path] = process.argv.slice(2)
  if (!authKey || !authSecret || !filePath || !path) {
    throw new Error(
      'Provide an Assembly key/secret and run: node seed.ts ./image.jpg website/image.jpg',
    )
  }
  const client = new Transloadit({
    authKey,
    authSecret,
    signatureAlgorithm: 'sha256',
    endpoint: process.env.TRANSLOADIT_ASSEMBLY_ENDPOINT,
  })
  console.log(JSON.stringify(await seedStorageImage(client, filePath, path), null, 2))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
