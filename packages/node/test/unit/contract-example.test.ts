import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@transloadit/node/contract', () => import('../../src/generated-contract/client.ts'))

const originalArgs = process.argv
const originalExitCode = process.exitCode

afterEach(() => {
  process.argv = originalArgs
  process.exitCode = originalExitCode
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('the executable example cancels an aborted Assembly before reporting failure', async () => {
  const assemblyId = '1'.repeat(32)
  const templateId = '2'.repeat(32)
  const owner = `https://api2-uploader.transloadit.com/assemblies/${assemblyId}`
  const requests: string[] = []
  const transport = vi.fn<typeof fetch>(async (url, init) => {
    const request = new Request(url, init)
    if (request.body !== null) await request.arrayBuffer()
    const path = new URL(request.url).pathname
    requests.push(`${request.method} ${path}`)
    if (path.startsWith('/templates'))
      return Response.json({ id: templateId, ok: 'TEMPLATE_CREATED' })
    if (path === '/assemblies')
      return Response.json({ assembly_id: assemblyId, ok: 'ASSEMBLY_UPLOADING' })
    expect(path).toBe(`/assemblies/${assemblyId}`)
    if (request.method === 'DELETE') expect(request.url).toBe(owner)
    return Response.json({
      assembly_id: assemblyId,
      assembly_ssl_url: owner,
      ok: request.method === 'DELETE' ? 'ASSEMBLY_CANCELED' : 'REQUEST_ABORTED',
    })
  })
  vi.stubGlobal('fetch', transport)
  vi.stubEnv('TRANSLOADIT_KEY', 'synthetic-example-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'synthetic-example-secret')
  vi.stubEnv('TRANSLOADIT_SIGNATURE_ALGORITHM', undefined)
  process.argv = [
    'node',
    'contract-workflow.ts',
    new URL('../e2e/fixtures/sample.jpg', import.meta.url).pathname,
  ]
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('../../examples/contract-workflow.ts')
  await vi.waitFor(() =>
    expect(diagnostic).toHaveBeenCalledWith('Assembly processing did not complete successfully'),
  )
  expect(process.exitCode).toBe(1)
  // Template deletion and Assembly cleanup are independent concurrent requests.
  expect(requests).toContain(`DELETE /templates/${templateId}`)
  expect(requests).toHaveLength(7)
  expect(requests.filter((request) => request !== `DELETE /templates/${templateId}`)).toEqual([
    'POST /templates',
    `GET /templates/${templateId}`,
    'POST /assemblies',
    `GET /assemblies/${assemblyId}`,
    `GET /assemblies/${assemblyId}`,
    `DELETE /assemblies/${assemblyId}`,
  ])
})
