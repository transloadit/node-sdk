import type { JsonValue } from '@transloadit/node/contract'

import { Transloadit } from '@transloadit/node'
import { ContractClient, ContractResponseError } from '@transloadit/node/contract'

/** Compile only: both published entry points must work with strict consumer settings. */
export async function probe(): Promise<JsonValue> {
  const client = new Transloadit({ authKey: 'not-a-key', authSecret: 'not-a-secret' }).contract()
  const standalone = new ContractClient({
    authentication: { kind: 'bearer', token: 'not-a-token' },
  })
  await standalone.listTemplates()
  // @ts-expect-error Creating a Template still requires its request parameters.
  await client.createTemplate()
  // @ts-expect-error Path parameters must not become optional with an empty params object.
  await client.getTemplate()
  try {
    const result = await client.getTemplate({ path: { templateIdOrName: 'example' } })
    return result.content
  } catch (error) {
    if (error instanceof ContractResponseError && error.code === 'TEMPLATE_NOT_FOUND') return null
    throw error
  }
}
