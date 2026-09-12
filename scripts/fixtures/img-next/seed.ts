import type { InterpolatableRobotTransloaditStoreInstructions } from '@transloadit/types/robots'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { Transloadit } from '@transloadit/node'

/** An application-owned record saved once after upload, not fetched during rendering. */
export interface StoredImageReceipt {
  asset_id: string
  height: number
  md5hash: string
  path: string
  size: number
  width: number
}

/** Seed one image with an Assembly key and verify its returned Storage receipt. */
export async function seedStorageImage(
  client: Transloadit,
  filePath: string,
): Promise<StoredImageReceipt> {
  const bytes = await readFile(filePath)
  const expectedMd5 = createHash('md5').update(bytes).digest('hex')
  const stored = {
    conflict_strategy: 'error',
    path: 'website/${file.url_name}',
    robot: '/transloadit/store',
    use: ':original',
  } satisfies InterpolatableRobotTransloaditStoreInstructions
  const assembly = await client.createAssembly({
    files: { photo: filePath },
    params: { steps: { stored } },
    waitForCompletion: true,
  })
  const result = assembly.results?.[':original']?.[0]
  const width = result?.meta?.width
  const height = result?.meta?.height
  if (
    assembly.ok !== 'ASSEMBLY_COMPLETED' ||
    typeof result?.asset_id !== 'string' ||
    result.asset_id === '' ||
    typeof result.path !== 'string' ||
    !result.path.startsWith('website/') ||
    result.size !== bytes.length ||
    bytes.length === 0 ||
    result.md5hash !== expectedMd5 ||
    typeof width !== 'number' ||
    !Number.isSafeInteger(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(height) ||
    height <= 0
  ) {
    throw new Error('The Assembly did not return a matching Storage image receipt')
  }
  return {
    asset_id: result.asset_id,
    height,
    md5hash: result.md5hash,
    path: result.path,
    size: result.size,
    width,
  }
}

async function main(): Promise<void> {
  const authKey = process.env.TRANSLOADIT_ASSEMBLY_KEY
  const authSecret = process.env.TRANSLOADIT_ASSEMBLY_SECRET
  const filePath = process.argv[2]
  if (!authKey || !authSecret || !filePath) {
    throw new Error('Provide an Assembly key/secret and run: node seed.ts ./image.jpg')
  }
  const client = new Transloadit({
    authKey,
    authSecret,
    endpoint: process.env.TRANSLOADIT_ASSEMBLY_ENDPOINT,
  })
  console.log(JSON.stringify(await seedStorageImage(client, filePath), null, 2))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
