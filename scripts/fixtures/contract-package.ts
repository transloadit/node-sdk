import type { ApiError, AssemblySteps, JsonDocument, JsonValue } from '@transloadit/node/contract'

import { Transloadit } from '@transloadit/node'
import { ContractClient, ContractResponseError } from '@transloadit/node/contract'

/** Compile only: both published entry points must work with strict consumer settings. */
export async function probe(): Promise<JsonValue> {
  const client = new Transloadit({ authKey: 'not-a-key', authSecret: 'not-a-secret' }).contract()
  const standalone = new ContractClient({
    authentication: { kind: 'bearer', token: 'not-a-token' },
  })
  const publicGrants = new ContractClient({ authentication: { kind: 'none' } })
  await publicGrants.issueBearerToken({
    body: { grant_type: 'refresh_token', refresh_token: 'compile-only' },
  })
  // @ts-expect-error Selecting no account authentication must not also configure credentials.
  new ContractClient({ authentication: { kind: 'none', token: 'compile-only' } })
  new ContractClient({
    authentication: {
      kind: 'signed',
      key: 'not-a-key',
      secret: 'not-a-secret',
      // @ts-expect-error The generated profile does not support arbitrary algorithm names.
      algorithm: 'md5',
    },
  })
  new ContractClient({
    authentication: {
      kind: 'signed',
      key: 'not-a-key',
      secret: 'not-a-secret',
      // @ts-expect-error Legacy SDK support does not imply support in the generated profile.
      algorithm: 'sha512',
    },
  })
  new ContractClient({
    authentication: {
      kind: 'signed',
      key: 'not-a-key',
      secret: 'not-a-secret',
      algorithm: 'sha256',
    },
  })
  await standalone.listTemplates()
  const steps: AssemblySteps = {
    resize: { robot: '/image/resize', use: ':original', width: 120 },
  }
  const metadata: JsonDocument = { nested: [true, 42, null] }
  const apiError: ApiError = { error: 'TEMPLATE_NOT_FOUND' }
  await client.createTemplate({
    params: {
      name: 'compile-only',
      template: { steps, fields: { metadata, apiError } },
    },
  })
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
