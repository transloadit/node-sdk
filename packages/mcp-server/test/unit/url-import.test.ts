import type { AssemblyStatus, CreateAssemblyOptions } from '@transloadit/node'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Transloadit } from '@transloadit/node'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'

const assemblyId = '0123456789abcdef0123456789abcdef'
const completed: AssemblyStatus = {
  ok: 'ASSEMBLY_COMPLETED',
  assembly_id: assemblyId,
  assembly_ssl_url: `https://api2.transloadit.com/assemblies/${assemblyId}`,
}
const resized = { robot: '/image/resize', use: ':original', width: 1, result: true }
const uploadSteps = { ':original': { robot: '/upload/handle' }, resized }
const firstUrl = 'http://198.51.100.10/first.jpg'
const secondUrl = 'http://198.51.100.10/second.jpg'

describe('URL inputs for Steps that take uploads', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined
  let created: CreateAssemblyOptions | undefined

  const call = async (args: Record<string, unknown>) => {
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'url-import', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    return client.callTool({ name: 'transloadit_create_assembly', arguments: args })
  }

  beforeEach(() => {
    created = undefined
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      created = options
      return Object.assign(Promise.resolve(completed), { assemblyId })
    })
  })

  afterEach(async () => {
    await client?.close()
    await server?.close()
    vi.restoreAllMocks()
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it('lets Transloadit import the URLs instead of downloading them', async () => {
    nock.disableNetConnect()

    const result = await call({
      instructions: { steps: uploadSteps },
      files: [
        { kind: 'url', field: 'first', url: firstUrl },
        { kind: 'url', field: 'second', url: secondUrl, filename: 'nested/holiday.jpg' },
      ],
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      upload: { status: 'none', total_files: 0 },
    })
    expect(created?.files).toEqual({})
    expect(created?.params?.steps).toEqual({
      imported: {
        robot: '/http/import',
        url: [firstUrl, secondUrl],
        // Named like the download it replaces, which kept the caller's file name.
        force_name: { [secondUrl]: 'holiday.jpg' },
      },
      resized: { ...resized, use: 'imported' },
    })
  })

  it.each([
    {
      name: 'URL inputs next to a base64 input',
      instructions: { steps: uploadSteps },
      extraFiles: [{ kind: 'base64', field: 'notes', base64: 'aGVsbG8=', filename: 'notes.txt' }],
    },
    {
      name: 'an upload Step with its own parameters',
      instructions: {
        steps: { ...uploadSteps, ':original': { robot: '/upload/handle', output_meta: true } },
      },
    },
    {
      name: 'Steps that select uploads by field',
      instructions: {
        steps: {
          ...uploadSteps,
          resized: { ...resized, use: { steps: [{ name: ':original', fields: 'first' }] } },
        },
      },
    },
    {
      name: 'one URL given twice under different names',
      instructions: { steps: uploadSteps },
      extraFiles: [{ kind: 'url', field: 'again', url: firstUrl, filename: 'again.jpg' }],
    },
    {
      name: 'a Step that relies on the implicit upload Step',
      instructions: { steps: { resized } },
    },
    {
      name: 'a saved Template',
      instructions: { template_id: 'saved-template' },
      template: { allow_steps_override: true, steps: uploadSteps },
    },
    {
      name: 'a Builtin Template called through the generic tool',
      instructions: { template_id: 'builtin/prepare-image@0.0.1' },
      template: { allow_steps_override: false, steps: uploadSteps },
    },
  ])('still downloads the URL for $name', async ({ instructions, extraFiles, template }) => {
    const download = nock('http://198.51.100.10')
      .get('/first.jpg')
      .times(1 + (extraFiles ?? []).filter((file) => file.kind === 'url').length)
      .reply(200, 'Image bytes')
    if (template) {
      nock('https://api2.transloadit.com')
        .get(`/templates/${instructions.template_id}`)
        .query(true)
        .reply(200, { id: instructions.template_id, content: template })
    }

    const result = await call({
      instructions,
      files: [{ kind: 'url', field: 'first', url: firstUrl }, ...(extraFiles ?? [])],
    })

    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(download.isDone()).toBe(true)
    expect(created?.files).toHaveProperty('first')
    expect(created?.params).toMatchObject(
      template ? { template_id: instructions.template_id } : instructions,
    )
  })
})
