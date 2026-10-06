import { expect, it, vi } from 'vitest'

import { runContractCanary } from '../contractCanary.ts'

const observations = vi.hoisted(() => ({ cancellations: 0, removals: 0 }))

vi.mock('../../src/generated-contract/client.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/generated-contract/client.ts')>()
  const { ContractResponseError } = original
  let template: { id: string; name: string; content: unknown; ok: string }
  let lists = 0
  return {
    ...original,
    ContractClient: class {
      createTemplate({ params }: { params: { name: string; template: unknown } }) {
        template = {
          id: 'template',
          name: params.name,
          content: params.template,
          ok: 'TEMPLATE_CREATED',
        }
        return Promise.resolve(template)
      }
      getTemplate({ path }: { path: { templateIdOrName: string } }) {
        return Promise.resolve({ ...template, id: path.templateIdOrName })
      }
      listTemplates() {
        lists++
        if (lists === 3) return Promise.reject(new ContractResponseError(400, {}))
        return Promise.resolve({
          count: 1,
          items: [{ ...template, id: lists === 2 ? 'builtin/test' : template.id }],
        })
      }
      issueBearerToken() {
        return Promise.resolve({ access_token: 'synthetic-token' })
      }
      deleteTemplate() {
        observations.removals++
        if (observations.removals === 1) return Promise.reject(new ContractResponseError(403, {}))
        return Promise.resolve({ ok: 'TEMPLATE_DELETED' })
      }
      createAssembly() {
        return Promise.resolve({ assembly_id: '1'.repeat(32), ok: 'ASSEMBLY_UPLOADING' })
      }
      uploadAssemblyFile(input: { onSession: (session: unknown) => void }) {
        input.onSession({})
        return Promise.reject(new Error('Synthetic upload interruption'))
      }
      resumeAssemblyFile() {
        return Promise.resolve({})
      }
      waitForAssembly() {
        return Promise.resolve({ assembly_id: '1'.repeat(32), ok: 'REQUEST_ABORTED' })
      }
      cancelAndWaitForAssembly() {
        observations.cancellations++
        return Promise.resolve({ ok: 'ASSEMBLY_CANCELED' })
      }
    },
  }
})

it('retains cleanup ownership when the runtime canary sees REQUEST_ABORTED', async () => {
  await expect(
    runContractCanary({
      origin: 'http://localhost:4000',
      capabilityOrigin: 'http://localhost:4000',
      key: 'synthetic-key',
      secret: 'synthetic-secret',
      file: [1],
      verify: () => undefined,
      async withCleanup(run, cleanup) {
        try {
          await run()
        } finally {
          await cleanup()
        }
      },
    }),
  ).rejects.toThrow('ASSEMBLY_COMPLETED')
  expect(observations.cancellations).toBe(1)
  expect(observations.removals).toBe(2)
})
