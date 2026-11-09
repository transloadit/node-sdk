import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

const endpoint = 'https://api2.transloadit.com'

describe('createAssembly onAssemblyCreated', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  it('reports the Assembly once API2 accepted the creation request', async () => {
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply((uri) => {
        const id = uri.split('/').at(-1)
        return [
          200,
          {
            ok: 'ASSEMBLY_EXECUTING',
            assembly_id: id,
            assembly_url: `${endpoint}/assemblies/${id}`,
            assembly_ssl_url: `${endpoint}/assemblies/${id}`,
          },
        ]
      })
    const created = vi.fn()

    const creation = client.createAssembly({
      params: { steps: { resized: { robot: '/image/resize', width: 1 } } },
      onAssemblyCreated: created,
    })
    await creation
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ assembly_id: creation.assemblyId }),
    )
  })

  it('does not report an Assembly when the creation response carries an error', async () => {
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, {
        error: 'INVALID_SIGNATURE',
        message: 'The given signature does not match ours. This Auth Key requires sha256.',
      })
    const created = vi.fn()

    await expect(
      client.createAssembly({
        params: { steps: { resized: { robot: '/image/resize', width: 1 } } },
        onAssemblyCreated: created,
      }),
    ).rejects.toThrow('INVALID_SIGNATURE')
    expect(created).not.toHaveBeenCalled()
  })
})
