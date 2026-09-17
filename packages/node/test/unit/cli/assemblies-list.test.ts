import { Readable } from 'node:stream'

import { afterEach, expect, it, vi } from 'vitest'

import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  process.exitCode = undefined
})

it.each([true, false])('projects Assembly --fields in JSON=%s output', async (json) => {
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
  vi.spyOn(Transloadit.prototype, 'streamAssemblies').mockReturnValue(
    Readable.from([{ id: 'assembly-id', status: 'ASSEMBLY_COMPLETED', params: { steps: {} } }]),
  )
  const stdout = vi.spyOn(console, 'log').mockImplementation(() => {})

  await main(['assemblies', 'list', '--fields', 'id,status', ...(json ? ['--json'] : [])])

  expect(process.exitCode).toBeUndefined()
  expect(stdout).toHaveBeenCalledWith(
    json
      ? JSON.stringify({ id: 'assembly-id', status: 'ASSEMBLY_COMPLETED' })
      : 'assembly-id ASSEMBLY_COMPLETED',
  )
})
