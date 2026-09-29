import type {
  AssemblyUploadSession,
  ContractClientOptions,
  CreateTemplateParams,
  JsonValue,
} from '../src/generated-contract/client.ts'

import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'

import { ContractClient, ContractResponseError } from '../src/generated-contract/client.ts'

interface CanaryOptions {
  origin: string
  capabilityOrigin: string
  key: string
  secret: string
  file: number[]
  verify: (operation: string, body: unknown) => void
  withCleanup: (run: () => Promise<void>, cleanup: () => Promise<void>) => Promise<void>
}

/** Local-only acceptance invoked by API2 with an owned, disposable auth fixture. */
export async function runContractCanary(options: CanaryOptions): Promise<void> {
  assert.equal(new URL(options.origin).hostname, 'localhost')
  let interruptUpload: (() => void) | undefined
  const clientOptions: ContractClientOptions = {
    origin: options.origin,
    assemblyOrigins: [options.capabilityOrigin],
    authentication: { kind: 'signed', key: options.key, secret: options.secret },
    fetch: async (input, init) => {
      const request = new Request(input, init)
      assert(
        [new URL(options.origin).origin, options.capabilityOrigin].includes(
          new URL(request.url).origin,
        ),
        'Never contact a non-local canary destination',
      )
      const response = await fetch(request)
      if (request.method === 'PATCH' && response.ok && interruptUpload !== undefined) {
        const interrupt = interruptUpload
        interruptUpload = undefined
        interrupt()
      }
      return response
    },
  }
  const client = new ContractClient(clientOptions)
  const signal = AbortSignal.timeout(90_000)
  const template = {
    steps: { passed: { robot: '/file/filter', use: ':original', result: true } },
  } satisfies CreateTemplateParams['template']
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
        signal,
      })
      options.verify('api2.get-template', retrieved)
      const content: JsonValue = retrieved.content
      assert.deepEqual(content, template)
      assert.equal(retrieved.id, created.id)
      const listed = await client.listTemplates({
        params: { keywords: [created.name], include_builtin: 'none' },
        signal,
      })
      options.verify('api2.list-templates', listed)
      assert.equal(listed.count, 1)
      assert.equal(listed.items[0]?.id, created.id)
      const builtins = await client.listTemplates({
        params: { include_builtin: 'exclusively-latest' },
        signal,
      })
      options.verify('api2.list-templates', builtins)
      const builtinId = builtins.items[0]?.id
      assert.equal(typeof builtinId, 'string')
      if (typeof builtinId !== 'string') throw new Error('Missing built-in Template')
      const builtin = await client.getTemplate({
        path: { templateIdOrName: builtinId },
        signal,
      })
      options.verify('api2.get-template', builtin)
      assert.equal(builtin.id, builtinId)
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
        (await bearer.getTemplate({ path: { templateIdOrName: created.id }, signal })).id,
        created.id,
      )
      await assert.rejects(
        bearer.deleteTemplate({ path: { templateIdOrName: created.id }, signal }),
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
        bad.listTemplates({ signal }),
        (error: unknown) => error instanceof ContractResponseError && error.status === 400,
      )
      const uploaded = await client.createAssembly({
        params: {
          template_id: created.id,
          auth: { max_size: 10_000_000, max_number_of_files: 1 },
        },
        fields: { num_expected_upload_files: '1' },
        signal,
      })
      assert.equal(typeof uploaded.assembly_id, 'string')
      if (typeof uploaded.assembly_id !== 'string') throw new Error('Missing Assembly ID')
      assemblies.add(uploaded.assembly_id)
      options.verify('api2.create-assembly', uploaded)
      const interrupted = new AbortController()
      interruptUpload = () => interrupted.abort(new Error('Owned interrupted upload'))
      let checkpoint: AssemblyUploadSession | undefined
      const file = {
        data: new Blob([new Uint8Array(options.file)], { type: 'image/gif' }),
        filename: 'smilie.gif',
      }
      await assert.rejects(
        client.uploadAssemblyFile({
          assemblyId: uploaded.assembly_id,
          file,
          chunkSize: 64,
          signal: interrupted.signal,
          onSession: (session) => {
            checkpoint = session
          },
        }),
      )
      assert(checkpoint, 'Upload checkpoint must be available before interruption')
      const fresh = new ContractClient(clientOptions)
      await fresh.resumeAssemblyFile({
        assemblyId: uploaded.assembly_id,
        file,
        session: checkpoint,
        chunkSize: 64,
        signal,
      })
      const completed = await client.waitForAssembly({
        assemblyId: uploaded.assembly_id,
        interval: 250,
        signal,
      })
      assemblies.delete(uploaded.assembly_id)
      options.verify('api2.get-assembly', completed)
      assert.equal(completed.ok, 'ASSEMBLY_COMPLETED')
      const digest = createHash('md5').update(new Uint8Array(options.file)).digest('hex')
      assert.equal(completed.uploads?.[0]?.md5hash, digest)
      assert.equal(completed.results?.passed?.[0]?.md5hash, digest)
      const pending = await client.createAssembly({
        params: { template_id: created.id },
        fields: { num_expected_upload_files: '1' },
        signal,
      })
      assert.equal(typeof pending.assembly_id, 'string')
      if (typeof pending.assembly_id !== 'string') throw new Error('Missing pending Assembly ID')
      assemblies.add(pending.assembly_id)
      assert.equal(pending.ok, 'ASSEMBLY_UPLOADING')
      const canceled = await client.cancelAndWaitForAssembly({
        assemblyId: pending.assembly_id,
        interval: 250,
        signal,
      })
      options.verify('api2.cancel-assembly', canceled)
      assert.equal(canceled.ok, 'ASSEMBLY_CANCELED')
      assemblies.delete(pending.assembly_id)
      const removed = await client.deleteTemplate({
        path: { templateIdOrName: created.id },
        signal,
      })
      options.verify('api2.delete-template', removed)
      assert.equal(removed.ok, 'TEMPLATE_DELETED')
      deleted = true
      await assert.rejects(
        client.getTemplate({ path: { templateIdOrName: created.id }, signal }),
        (error: unknown) =>
          error instanceof ContractResponseError &&
          error.status === 400 &&
          error.code === 'TEMPLATE_NOT_FOUND',
      )
      assert.equal(
        (await client.listTemplates({ params: { include_builtin: 'none' }, signal })).count,
        0,
      )
    },
    async () => {
      const cleanup = await Promise.allSettled([
        ...[...assemblies].map((assemblyId) =>
          client.cancelAndWaitForAssembly({ assemblyId, signal: AbortSignal.timeout(15_000) }),
        ),
        ...(deleted
          ? []
          : [
              client.deleteTemplate({
                path: { templateIdOrName: created.id },
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
