import { afterEach, expect, it, vi } from 'vitest'

const workflow = vi.hoisted(() => ({
  construct: vi.fn(),
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  createAssembly: vi.fn(),
  getAssembly: vi.fn(),
  deleteTemplate: vi.fn(),
  cancelAssembly: vi.fn(),
  waitForAssembly: vi.fn(),
  cancelAndWaitForAssembly: vi.fn(),
}))

vi.mock('@transloadit/node/contract', () => ({
  isContractSignatureAlgorithm: (value: string) => ['sha384', 'sha256', 'sha1'].includes(value),
  ContractClient: class {
    constructor(options: unknown) {
      workflow.construct(options)
    }

    createTemplate = workflow.createTemplate
    getTemplate = workflow.getTemplate
    createAssembly = workflow.createAssembly
    getAssembly = workflow.getAssembly
    deleteTemplate = workflow.deleteTemplate
    cancelAssembly = workflow.cancelAssembly
    waitForAssembly = workflow.waitForAssembly
    cancelAndWaitForAssembly = workflow.cancelAndWaitForAssembly
  },
  ContractResponseError: class extends Error {},
}))
vi.mock('node:fs/promises', () => ({ readFile: () => Promise.resolve(new Uint8Array([1])) }))

const originalArgs = process.argv
const originalExitCode = process.exitCode
afterEach(() => {
  process.argv = originalArgs
  process.exitCode = originalExitCode
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it.each([
  'ASSEMBLY_CANCELED',
  'REQUEST_ABORTED',
  'ASSEMBLY_REPLAYING',
])('handles %s in the executable workflow', async (ok) => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('TRANSLOADIT_KEY', 'synthetic-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'synthetic-secret')
  vi.stubEnv('TRANSLOADIT_SIGNATURE_ALGORITHM', 'sha256')
  process.argv = ['node', 'contract-workflow.ts', 'example.jpg']
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  workflow.createTemplate.mockResolvedValue({ id: 'template' })
  workflow.getTemplate.mockResolvedValue({ id: 'template' })
  workflow.createAssembly.mockResolvedValue({ assembly_id: 'assembly', ok })
  workflow.waitForAssembly.mockResolvedValue({
    assembly_id: 'assembly',
    ok: ok === 'ASSEMBLY_REPLAYING' ? 'ASSEMBLY_COMPLETED' : ok,
    results: { resize: [{ ssl_url: 'https://example.invalid/result.jpg' }] },
  })
  workflow.deleteTemplate.mockResolvedValue({ ok: 'TEMPLATE_DELETED' })
  workflow.cancelAssembly.mockResolvedValue({ ok: 'ASSEMBLY_CANCELED' })
  workflow.cancelAndWaitForAssembly.mockResolvedValue({ ok: 'ASSEMBLY_CANCELED' })
  await import('../../examples/contract-workflow.ts')
  await vi.waitFor(() => expect(workflow.deleteTemplate).toHaveBeenCalledOnce())
  expect(workflow.construct).toHaveBeenCalledWith({
    authentication: {
      kind: 'signed',
      key: 'synthetic-key',
      secret: 'synthetic-secret',
      algorithm: 'sha256',
    },
  })
  expect(workflow.cancelAssembly).not.toHaveBeenCalled()
  expect(workflow.getAssembly).not.toHaveBeenCalled()
  expect(workflow.waitForAssembly).toHaveBeenCalledOnce()
  if (ok === 'ASSEMBLY_REPLAYING') {
    expect(workflow.cancelAndWaitForAssembly).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  } else {
    expect(workflow.cancelAndWaitForAssembly).toHaveBeenCalledExactlyOnceWith({
      assemblyId: 'assembly',
      signal: expect.any(AbortSignal),
    })
    expect(error).toHaveBeenCalledWith('Assembly processing did not complete successfully')
  }
})

it('rejects an unsupported key algorithm before creating any resources', async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('TRANSLOADIT_KEY', 'synthetic-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'synthetic-secret')
  vi.stubEnv('TRANSLOADIT_SIGNATURE_ALGORITHM', 'unsupported-private-value')
  process.argv = ['node', 'contract-workflow.ts', 'example.jpg']
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await import('../../examples/contract-workflow.ts')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  expect(error).toHaveBeenCalledWith('Unsupported TRANSLOADIT_SIGNATURE_ALGORITHM')
  expect(workflow.construct).not.toHaveBeenCalled()
  expect(workflow.createTemplate).not.toHaveBeenCalled()
})
