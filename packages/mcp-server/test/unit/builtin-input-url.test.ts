import type { AssemblyStatus, CreateAssemblyOptions, InputFile } from '@transloadit/node'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ApiError, Transloadit } from '@transloadit/node'
import {
  mcpBuiltinInputUrlMaxCounts,
  mcpBuiltinTemplateManifest,
} from '@transloadit/zod/v4/builtinTemplates'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { selectBuiltinInputUrls } from '../../src/builtin-shortcuts.ts'
import { createTransloaditMcpServer } from '../../src/server.ts'

const assemblyId = '0123456789abcdef0123456789abcdef'
const executing: AssemblyStatus = {
  ok: 'ASSEMBLY_EXECUTING',
  assembly_id: assemblyId,
  assembly_ssl_url: `https://api2.transloadit.com/assemblies/${assemblyId}`,
  num_input_files: 0,
}
const completed: AssemblyStatus = { ...executing, ok: 'ASSEMBLY_COMPLETED' }
// TEST-NET-2: public to the download guard, and never resolved through DNS.
const origin = 'http://198.51.100.10'
const photo = `${origin}/photo.jpg`
const other = `${origin}/other.jpg`

const catalogEntry = (id: string) => ({
  id,
  name: id,
  require_signature_auth: 0,
  fields_schema: { type: 'object', properties: {} },
  content: { steps: { ':original': { robot: '/upload/handle' } } },
})

const url = (value: string, field = 'file'): InputFile => ({ kind: 'url', field, url: value })

describe('Builtin input_url eligibility', () => {
  it('pins the API2 Builtins that accept input_url to approved MCP versions', () => {
    // api2#10292 builtinInputImportTemplateNames; capture-webpage keeps its own URL field.
    expect(mcpBuiltinInputUrlMaxCounts).toEqual({
      'builtin/caption-video@0.0.1': 1,
      'builtin/convert-to-pdf@0.0.1': 10,
      'builtin/encode-video@0.0.1': 10,
      'builtin/extract-text@0.0.1': 10,
      'builtin/prepare-image@0.0.1': 10,
      'builtin/remove-background@0.0.1': 10,
      'builtin/transcribe@0.0.1': 10,
      'builtin/video-covers@0.0.1': 10,
    })
    for (const id of Object.keys(mcpBuiltinInputUrlMaxCounts)) {
      expect(mcpBuiltinTemplateManifest).toHaveProperty([id])
    }
  })

  it('selects URLs only when every input is a literal HTTP(S) URL within the limit', () => {
    const id = 'builtin/prepare-image@0.0.1'
    expect(selectBuiltinInputUrls(id, [url(photo, 'a'), url(other, 'b')])).toEqual([photo, other])
    expect(selectBuiltinInputUrls(id, [url(photo)], 1)).toEqual([photo])
    expect(selectBuiltinInputUrls(id, [])).toBeUndefined()
    expect(selectBuiltinInputUrls(id, [url(photo)], 2)).toBeUndefined()
    expect(
      selectBuiltinInputUrls(id, [
        url(photo),
        { kind: 'base64', field: 'b', base64: 'aGk=', filename: 'b.txt' },
      ]),
    ).toBeUndefined()
    expect(selectBuiltinInputUrls(id, [{ kind: 'path', field: 'p', path: '/tmp/p' }])).toBe(
      undefined,
    )
    expect(
      selectBuiltinInputUrls(
        id,
        Array.from({ length: 11 }, (_, i) => url(`${origin}/${i}.jpg`, `f${i}`)),
      ),
    ).toBeUndefined()
    expect(selectBuiltinInputUrls('builtin/capture-webpage@0.0.1', [url(photo)])).toBeUndefined()
    expect(selectBuiltinInputUrls('builtin/prepare-image@0.0.2', [url(photo)])).toBeUndefined()
  })

  it('keeps only one URL for caption-video', () => {
    const id = 'builtin/caption-video@0.0.1'
    expect(selectBuiltinInputUrls(id, [url(photo)])).toEqual([photo])
    expect(selectBuiltinInputUrls(id, [url(photo, 'a'), url(other, 'b')])).toBeUndefined()
  })

  it.each([
    'ftp://example.com/a.jpg',
    '/relative.jpg',
    'https://example.com/a b.jpg',
    'https://example.com/${fields.secret}',
    'https://example.com/a.jpg|https://example.com/b.jpg',
    `https://example.com/${'a'.repeat(4096)}`,
  ])('leaves URLs API2 would refuse to the download path: %s', (value) => {
    expect(selectBuiltinInputUrls('builtin/prepare-image@0.0.1', [url(value)])).toBeUndefined()
  })
})

describe('Builtin shortcuts with URL inputs', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined
  const creations: CreateAssemblyOptions[] = []

  const call = async (name: string, id: string, args: Record<string, unknown>) => {
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({
      items: [catalogEntry(id)],
      count: 1,
    })
    vi.spyOn(Transloadit.prototype, 'getTemplate').mockResolvedValue({
      ok: 'TEMPLATE_FOUND',
      message: 'Found',
      id,
      name: id,
      require_signature_auth: 0,
      content: {
        allow_steps_override: false,
        steps: { ':original': { robot: '/upload/handle' } },
      },
    })
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'builtin-input-url', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    return client.callTool({ name, arguments: args })
  }

  /** Each creation answers with the next status; a function rejects instead. */
  const createReturns = (...statuses: Array<AssemblyStatus | (() => never)>) => {
    let index = 0
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      creations.push(options ?? {})
      const next = statuses[Math.min(index, statuses.length - 1)]
      index += 1
      if (typeof next === 'function') {
        return Object.assign(Promise.resolve().then(next), { assemblyId })
      }
      if (!next) throw new Error('Expected a status for every creation')
      options?.onAssemblyCreated?.(next)
      return Object.assign(Promise.resolve(next), { assemblyId })
    })
  }

  afterEach(async () => {
    await client?.close()
    await server?.close()
    vi.restoreAllMocks()
    nock.cleanAll()
    creations.length = 0
  })

  it('sends URL files and attachments as input_url with template_id and downloads nothing', async () => {
    const download = nock(origin).get(/.*/).reply(200, 'bytes')
    createReturns(executing)
    const status = vi.spyOn(Transloadit.prototype, 'getAssembly')

    const result = await call('transloadit_prepare_image', 'builtin/prepare-image@0.0.1', {
      fields: { w: 320 },
      files: [url(photo)],
      attachments: [{ download_url: other, file_id: 'file_1' }],
      expected_uploads: 2,
    })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      assembly: { assembly_id: assemblyId },
      upload: { status: 'none', total_files: 0 },
    })
    expect(creations).toHaveLength(1)
    expect(creations[0]).toMatchObject({ files: {}, uploads: {}, expectedUploads: undefined })
    expect(creations[0]?.params).toEqual({
      template_id: 'builtin/prepare-image@0.0.1',
      input_url: [photo, other],
      fields: { w: 320 },
    })
    expect(download.isDone()).toBe(false)
    // API2 with input_url runs on every host, so nothing checks whether it was used.
    expect(status).not.toHaveBeenCalled()
  })

  it('sends one caption-video URL as input_url but downloads two', async () => {
    createReturns({ ...completed, num_input_files: 1 })
    await call('transloadit_caption_video', 'builtin/caption-video@0.0.1', {
      files: [url(photo)],
      wait_for_completion: true,
    })
    expect(creations[0]?.params).toMatchObject({ input_url: [photo] })

    await client?.close()
    await server?.close()
    vi.restoreAllMocks()
    creations.length = 0
    const downloads = nock(origin)
      .get(/\.jpg$/)
      .times(2)
      .reply(200, 'bytes')
    createReturns({ ...completed, num_input_files: 2 })
    await call('transloadit_caption_video', 'builtin/caption-video@0.0.1', {
      files: [url(photo, 'a'), url(other, 'b')],
      wait_for_completion: true,
    })
    expect(downloads.isDone()).toBe(true)
    expect(creations).toHaveLength(1)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
    expect(Object.keys(creations[0]?.files ?? {})).toEqual(['a', 'b'])
  })

  it.each([
    {
      name: 'a URL next to a base64 file',
      args: {
        files: [url(photo), { kind: 'base64', field: 'inline', base64: 'aGk=', filename: 'a.txt' }],
      },
      files: ['file', 'inline'],
    },
    { name: 'a URL with sandbox uploads', args: { files: [url(photo)], expected_uploads: 2 } },
  ])('keeps the download path for $name', async ({ args, files = ['file'] }) => {
    const download = nock(origin).get('/photo.jpg').reply(200, 'bytes')
    createReturns(executing)
    await call('transloadit_prepare_image', 'builtin/prepare-image@0.0.1', args)
    expect(download.isDone()).toBe(true)
    expect(creations).toHaveLength(1)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
    expect(Object.keys(creations[0]?.files ?? {})).toEqual(files)
  })

  it('keeps the download path for Builtins that do not accept input_url', async () => {
    const download = nock(origin).get('/photo.jpg').reply(200, 'bytes')
    createReturns(executing)
    await call('transloadit_capture_webpage', 'builtin/capture-webpage@0.0.1', {
      files: [url(photo)],
    })
    expect(download.isDone()).toBe(true)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
  })

  it('returns an Assembly that ran without input files as API2 reported it', async () => {
    const download = nock(origin).get('/photo.jpg').reply(200, 'bytes')
    createReturns(completed)
    const result = await call('transloadit_prepare_image', 'builtin/prepare-image@0.0.1', {
      files: [url(photo)],
      wait_for_completion: true,
    })
    expect(creations).toHaveLength(1)
    expect(download.isDone()).toBe(false)
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      assembly: { assembly_id: assemblyId, ok: 'ASSEMBLY_COMPLETED', num_input_files: 0 },
    })
  })

  it('surfaces API2’s refusal of input_url instead of downloading the URLs', async () => {
    const download = nock(origin).get('/photo.jpg').reply(200, 'bytes')
    const reason =
      '“input_url” is only supported with Builtin Templates that accept an input file. Select one with “template_id”, or import the URLs with an /http/import Step instead.'
    createReturns(() => {
      throw new ApiError({ body: { error: 'INVALID_FORM_DATA', reason } })
    }, executing)
    const result = await call('transloadit_prepare_image', 'builtin/prepare-image@0.0.1', {
      files: [url(photo)],
    })
    expect(result.isError).toBe(true)
    expect(creations).toHaveLength(1)
    expect(creations[0]?.params).toMatchObject({ input_url: [photo] })
    expect(download.isDone()).toBe(false)
    expect(JSON.stringify(result.content)).toContain('INVALID_FORM_DATA')
  })

  it('keeps upload reservations for upload_behavior none', async () => {
    nock(origin).get('/photo.jpg').reply(200, 'bytes')
    createReturns(executing)
    await call('transloadit_prepare_image', 'builtin/prepare-image@0.0.1', {
      files: [url(photo)],
      upload_behavior: 'none',
    })
    expect(creations).toHaveLength(1)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
    expect(Object.keys(creations[0]?.files ?? {})).toEqual(['file'])
  })

  it.each([
    { name: 'a file', args: { files: [{ ...url(`${origin}/doc`), filename: 'notes.md' }] } },
    {
      name: 'an attachment',
      args: {
        attachments: [{ download_url: `${origin}/doc`, file_id: 'f', file_name: 'notes.md' }],
      },
    },
  ])('downloads $name whose given name differs from its URL, to keep that name', async ({
    args,
  }) => {
    const download = nock(origin).get('/doc').reply(200, '# Notes')
    createReturns(executing)
    await call('transloadit_convert_to_pdf', 'builtin/convert-to-pdf@0.0.1', args)
    expect(download.isDone()).toBe(true)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
  })

  it('downloads a URL given a name even when its URL ends in that name', async () => {
    // Redirects or Content-Disposition can rename an imported file; only a download keeps it.
    const download = nock(origin).get('/notes.md').reply(200, '# Notes')
    createReturns(executing)
    await call('transloadit_convert_to_pdf', 'builtin/convert-to-pdf@0.0.1', {
      attachments: [{ download_url: `${origin}/notes.md`, file_id: 'f', file_name: 'notes.md' }],
    })
    expect(download.isDone()).toBe(true)
    expect(creations[0]?.params).not.toHaveProperty('input_url')
  })
})
