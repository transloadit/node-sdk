import type { CreateTemplateParams } from '@transloadit/node/contract'

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import {
  ContractClient,
  ContractResponseError,
  isContractSignatureAlgorithm,
} from '@transloadit/node/contract'

// Run with Node 26, TRANSLOADIT_KEY and TRANSLOADIT_SECRET set in a trusted server-side shell:
// node packages/node/examples/contract-workflow.ts ./image.jpg
// Set TRANSLOADIT_SIGNATURE_ALGORITHM=sha256 for a combined Smart CDN/Assembly key.
async function main(): Promise<void> {
  const key = process.env.TRANSLOADIT_KEY
  const secret = process.env.TRANSLOADIT_SECRET
  const filename = process.argv[2]
  if (!key || !secret || !filename) {
    throw new Error('Set TRANSLOADIT_KEY and TRANSLOADIT_SECRET and pass an image path')
  }
  const algorithm = process.env.TRANSLOADIT_SIGNATURE_ALGORITHM
  if (algorithm !== undefined && !isContractSignatureAlgorithm(algorithm)) {
    throw new Error('Unsupported TRANSLOADIT_SIGNATURE_ALGORITHM')
  }
  const data = await readFile(filename)
  const client = new ContractClient({
    authentication: { kind: 'signed', key, secret, ...(algorithm ? { algorithm } : {}) },
  })
  const signal = AbortSignal.timeout(120_000)
  const template = {
    steps: { resize: { robot: '/image/resize', use: ':original', width: 120, result: true } },
  } satisfies CreateTemplateParams['template']
  const created = await client.createTemplate({
    params: { name: `sdk-example-${randomUUID()}`, template },
    signal,
  })
  let assemblyId: string | undefined
  let finished = false
  const failures: unknown[] = []
  try {
    await client.getTemplate({ path: { templateIdOrName: created.id }, signal })
    const uploaded = await client.createAssembly({
      params: { template_id: created.id },
      files: { file: { data: new Blob([data]), filename: basename(filename) } },
      signal,
    })
    assemblyId = uploaded.assembly_id
    if (!assemblyId) throw new Error('The API did not return an Assembly ID')
    const status = await client.waitForAssembly({ assemblyId, signal })
    if (status.ok !== 'ASSEMBLY_COMPLETED')
      throw new Error('Assembly processing did not complete successfully')
    finished = true
    const result = status.results?.resize?.[0]
    if (!result?.ssl_url) throw new Error('The completed Assembly has no resized image URL')
    console.log('Resized image:', result.ssl_url)
    console.log('Download this temporary result before it expires, or add a storage Step.')
  } catch (error) {
    failures.push(error)
  }
  const cleanup = await Promise.allSettled([
    client.deleteTemplate({
      path: { templateIdOrName: created.id },
      signal: AbortSignal.timeout(15_000),
    }),
    ...(!finished && assemblyId
      ? [client.cancelAndWaitForAssembly({ assemblyId, signal: AbortSignal.timeout(15_000) })]
      : []),
  ])
  for (const result of cleanup) {
    if (result.status === 'rejected') failures.push(result.reason)
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, 'Workflow and cleanup failed')
}

main().catch((error: unknown) => {
  if (error instanceof ContractResponseError) {
    // Code is present only when the body contains a code recognized by the generated contract.
    // In particular, TEMPLATE_NOT_FOUND is HTTP 400, not 404.
    console.error(error.message, error.code ?? '(unrecognized error code)')
  } else {
    console.error(error instanceof Error ? error.message : 'Unexpected workflow failure')
  }
  process.exitCode = 1
})
