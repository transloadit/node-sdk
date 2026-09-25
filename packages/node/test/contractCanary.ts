import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import { ContractClient, ContractResponseError } from '../src/generated-contract/client.ts'

interface CanaryOptions {
  origin: string
  key: string
  secret: string
  file: number[]
  verify: (operation: string, body: unknown) => void
  withCleanup: (run: () => Promise<void>, cleanup: () => Promise<void>) => Promise<void>
}

/** Local-only acceptance invoked by API2 with an owned, disposable auth fixture. */
export async function runContractCanary(options: CanaryOptions): Promise<void> {
  assert.equal(new URL(options.origin).hostname, 'localhost')
  const client = new ContractClient({
    origin: options.origin,
    authentication: { kind: 'signed', key: options.key, secret: options.secret },
  })
  const signal = AbortSignal.timeout(90_000)
  const template = {
    steps: { passed: { robot: '/file/filter' as const, use: ':original', result: true } },
  }
  const created = await client.createTemplate({
    params: { name: `contract-${randomUUID()}`, template },
    signal,
  })
  const assemblies = new Set<string>()
  let deleted = false
  await options.withCleanup(
    async () => {
      options.verify('api2.create-template', created)
      assert.equal(created.ok, 'TEMPLATE_CREATED')
      assert.deepEqual(created.content, template)
      const retrieved = await client.getTemplate({
        path: { templateIdOrName: created.id },
        params: {},
        signal,
      })
      options.verify('api2.get-template', retrieved)
      assert.equal(retrieved.id, created.id)
      const listed = await client.listTemplates({
        params: { keywords: [created.name], include_builtin: 'none' },
        signal,
      })
      options.verify('api2.list-templates', listed)
      assert.equal(listed.count, 1)
      assert.equal(listed.items[0]?.id, created.id)
      const token = await client.issueBearerToken({
        body: { grant_type: 'client_credentials', aud: 'api2', scope: 'templates:read' },
        signal,
      })
      options.verify('api2.issue-bearer-token', token)
      const bearer = new ContractClient({
        origin: options.origin,
        authentication: { kind: 'bearer', token: token.access_token },
      })
      assert.equal(
        (await bearer.getTemplate({ path: { templateIdOrName: created.id }, params: {}, signal }))
          .id,
        created.id,
      )
      await assert.rejects(
        bearer.deleteTemplate({ path: { templateIdOrName: created.id }, params: {}, signal }),
        (error: unknown) => error instanceof ContractResponseError && error.status === 403,
      )
      const bad = new ContractClient({
        origin: options.origin,
        authentication: {
          kind: 'signed',
          key: options.key,
          secret: 'deliberately-wrong-test-secret',
        },
      })
      await assert.rejects(
        bad.listTemplates({ params: {}, signal }),
        (error: unknown) => error instanceof ContractResponseError && error.status === 400,
      )
      const uploaded = await client.createAssembly({
        params: { template_id: created.id },
        files: {
          file: {
            data: new Blob([new Uint8Array(options.file)], { type: 'image/gif' }),
            filename: 'smilie.gif',
          },
        },
        signal,
      })
      assert.equal(typeof uploaded.assembly_id, 'string')
      if (typeof uploaded.assembly_id !== 'string') throw new Error('Missing Assembly ID')
      assemblies.add(uploaded.assembly_id)
      options.verify('api2.create-assembly', uploaded)
      let completed = uploaded
      while (completed.ok !== 'ASSEMBLY_COMPLETED') {
        assert(!('error' in completed), 'Assembly processing failed')
        assert.notEqual(completed.ok, 'ASSEMBLY_CANCELED')
        await delay(250, undefined, { signal })
        completed = await client.getAssembly({ path: { assemblyId: uploaded.assembly_id }, signal })
        options.verify('api2.get-assembly', completed)
      }
      assemblies.delete(uploaded.assembly_id)
      const digest = createHash('md5').update(new Uint8Array(options.file)).digest('hex')
      assert.equal(completed.uploads?.[0]?.md5hash, digest)
      assert.equal(completed.results?.passed?.[0]?.md5hash, digest)
      const removed = await client.deleteTemplate({
        path: { templateIdOrName: created.id },
        params: {},
        signal,
      })
      options.verify('api2.delete-template', removed)
      assert.equal(removed.ok, 'TEMPLATE_DELETED')
      deleted = true
      assert.equal(
        (await client.listTemplates({ params: { include_builtin: 'none' }, signal })).count,
        0,
      )
    },
    async () => {
      const cleanup = await Promise.allSettled([
        ...[...assemblies].map((assemblyId) =>
          client.cancelAssembly({ path: { assemblyId }, signal: AbortSignal.timeout(15_000) }),
        ),
        ...(deleted
          ? []
          : [
              client.deleteTemplate({
                path: { templateIdOrName: created.id },
                params: {},
                signal: AbortSignal.timeout(15_000),
              }),
            ]),
      ])
      const failures = cleanup.filter((result) => result.status === 'rejected')
      if (failures.length > 0)
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          'Contract canary cleanup failed',
        )
    },
  )
}
