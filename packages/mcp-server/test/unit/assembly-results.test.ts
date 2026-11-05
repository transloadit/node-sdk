import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { AssemblyStatus } from '@transloadit/node'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { Transloadit } from '@transloadit/node'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'
import { widgetContextMetaKey } from '../../src/ui/assembly-result-widget.ts'

const assemblyId = '0123456789abcdef0123456789abcdef'
const assemblyUrl = `https://api2.transloadit.com/assemblies/${assemblyId}`
const instructions = { steps: { thumbs: { robot: '/video/thumbs', count: 8 } } }
const tools = [
  { name: 'transloadit_create_assembly', arguments: { instructions, wait_for_completion: true } },
  {
    name: 'transloadit_video_covers',
    arguments: { files: [{ kind: 'url', field: 'file', url: 'https://example.com/video.mp4' }] },
  },
  { name: 'transloadit_get_assembly_status', arguments: { assembly_url: assemblyUrl } },
  { name: 'transloadit_wait_for_assembly', arguments: { assembly_url: assemblyUrl } },
]
const cover = (index: number) => ({
  name: `cover-${index}.jpg`,
  mime: 'image/jpeg',
  ssl_url: `https://results.example.com/cover-${index}.jpg`,
})
const completed: AssemblyStatus = {
  ok: 'ASSEMBLY_COMPLETED',
  assembly_id: assemblyId,
  assembly_ssl_url: assemblyUrl,
  results: {
    thumbs: Array.from({ length: 8 }, (_, index) => cover(index + 1)),
    transcript: [
      {
        name: 'transcript.txt',
        mime: 'text/plain',
        ssl_url: 'https://results.example.com/transcript.txt',
      },
    ],
  },
}

describe('Assembly result links for clients without a widget', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined

  const call = async (
    tool: (typeof tools)[number],
    assembly: AssemblyStatus,
  ): Promise<CallToolResult> => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
      Object.assign(Promise.resolve(assembly), { assemblyId }),
    )
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockResolvedValue(assembly)
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue(assembly)
    const template = {
      id: 'builtin/video-covers@0.0.1',
      name: 'Video covers',
      require_signature_auth: 0,
      fields_schema: { type: 'object', properties: {} },
      content: { steps: { ':original': { robot: '/upload/handle' } } },
    }
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({
      items: [template],
      count: 1,
    })
    vi.spyOn(Transloadit.prototype, 'getTemplate').mockResolvedValue({
      ...template,
      ok: 'TEMPLATE_FOUND',
      message: 'Found',
    })
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'text-only-client', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    return CallToolResultSchema.parse(await client.callTool(tool))
  }

  afterEach(async () => {
    await client?.close()
    await server?.close()
    vi.restoreAllMocks()
  })

  it.each(tools)('lists completed result files as readable text in $name', async (tool) => {
    const result = await call(tool, completed)

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent?.assembly).toEqual(completed)
    expect(result.content).toContainEqual({
      type: 'text',
      text: JSON.stringify(result.structuredContent),
    })
    expect(result.content).toContainEqual({
      type: 'text',
      text: [
        'Result files:',
        ...Array.from(
          { length: 8 },
          (_, index) =>
            `- Step thumbs, cover-${index + 1}.jpg: https://results.example.com/cover-${index + 1}.jpg`,
        ),
        '- Step transcript, transcript.txt: https://results.example.com/transcript.txt',
      ].join('\n'),
    })
    expect(result._meta).toEqual(
      tool.name === 'transloadit_get_assembly_status'
        ? undefined
        : { [widgetContextMetaKey]: { authenticated: true } },
    )
  })

  it.each(tools)('keeps running Assembly text unchanged in $name', async (tool) => {
    const running: AssemblyStatus = { ...completed, ok: 'ASSEMBLY_EXECUTING', results: {} }
    const result = await call(tool, running)

    expect(result.structuredContent?.assembly).toEqual(running)
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(result.structuredContent) },
    ])
  })

  it.each(
    tools,
  )('caps text links across Steps while keeping every structured result in $name', async (tool) => {
    const assembly: AssemblyStatus = {
      ...completed,
      results: {
        first: Array.from({ length: 12 }, (_, index) => cover(index + 1)),
        second: Array.from({ length: 13 }, (_, index) => cover(index + 13)),
      },
    }
    const result = await call(tool, assembly)
    const content = JSON.stringify(result.content)
    const summary = result.content.filter((item) => item.type === 'text')[1]?.text ?? ''

    expect(result.structuredContent?.assembly).toEqual(assembly)
    expect(summary.match(/https:\/\/results\.example\.com\/cover-\d+\.jpg/g)).toHaveLength(20)
    expect(content).toContain('Step first, cover-1.jpg: https://results.example.com/cover-1.jpg')
    expect(content).toContain('Step second, cover-20.jpg: https://results.example.com/cover-20.jpg')
    expect(content).not.toContain('https://results.example.com/cover-21.jpg')
    expect(content).toContain('… 5 more result files not listed.')
    expect(result.content).toContainEqual({
      type: 'text',
      text: JSON.stringify({
        ...result.structuredContent,
        assembly: {
          ...assembly,
          results: { first: assembly.results?.first, second: assembly.results?.second.slice(0, 8) },
        },
      }),
    })
  })

  it('does not add a file list when a completed Assembly has no results', async () => {
    const result = await call(tools[2], { ...completed, results: {} })

    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(result.structuredContent) },
    ])
  })

  it.each([20, 21])('handles the text limit boundary with %i result files', async (count) => {
    const result = await call(tools[2], {
      ...completed,
      results: { thumbs: Array.from({ length: count }, (_, index) => cover(index + 1)) },
    })
    const content = result.content.filter((item) => item.type === 'text')[1]?.text ?? ''

    expect(content.match(/https:\/\/results\.example\.com\/cover-\d+\.jpg/g)).toHaveLength(20)
    expect(content.includes('… 1 more result file not listed.')).toBe(count === 21)
  })

  it('preserves result metadata for text-only clients', async () => {
    const result = await call(tools[2], {
      ...completed,
      results: {
        described: [
          { ...cover(1), meta: { descriptions: ['A dog running through a field.'] } },
          { name: 'metadata-only.jpg', meta: { descriptions: ['A cat resting on a sofa.'] } },
        ],
      },
    })

    expect(result.content).toContainEqual({
      type: 'text',
      text: JSON.stringify(result.structuredContent),
    })
    expect(JSON.stringify(result.content)).toContain('A dog running through a field.')
    expect(JSON.stringify(result.content)).toContain('A cat resting on a sofa.')
  })

  it('links to a signed SSL URL when a private result supplies one', async () => {
    const signedUrl = 'https://results.example.com/private.jpg?X-Amz-Signature=test'
    const result = await call(tools[2], {
      ...completed,
      results: { private: [{ ...cover(1), signed_ssl_url: signedUrl }] },
    })

    expect(result.content).toContainEqual({
      type: 'text',
      text: `Result files:\n- Step private, cover-1.jpg: ${signedUrl}`,
    })
  })

  it('links to url when a result has no SSL URL', async () => {
    const result = await call(tools[2], {
      ...completed,
      results: {
        thumbs: [cover(1), { name: 'legacy.jpg', url: 'https://results.example.com/legacy.jpg' }],
      },
    })

    expect(result.content).toContainEqual({
      type: 'text',
      text: [
        'Result files:',
        '- Step thumbs, cover-1.jpg: https://results.example.com/cover-1.jpg',
        '- Step thumbs, legacy.jpg: https://results.example.com/legacy.jpg',
      ].join('\n'),
    })
  })

  it('skips files without download URLs and supplies a label for an unnamed file', async () => {
    const result = await call(tools[2], {
      ...completed,
      results: {
        empty: [],
        thumbs: [
          { name: 'missing.jpg' },
          { name: 'null.jpg', ssl_url: null },
          { name: 'empty.jpg', ssl_url: '' },
          { ssl_url: cover(1).ssl_url },
        ],
      },
    })

    expect(result.content).toContainEqual({
      type: 'text',
      text: 'Result files:\n- Step thumbs, Unnamed file: https://results.example.com/cover-1.jpg',
    })
  })

  it('keeps file links on one line when names contain newlines', async () => {
    const result = await call(tools[2], {
      ...completed,
      results: { 'video\r\ncovers': [{ ...cover(1), name: 'cover\n1.jpg' }] },
    })

    expect(result.content).toContainEqual({
      type: 'text',
      text: 'Result files:\n- Step video  covers, cover 1.jpg: https://results.example.com/cover-1.jpg',
    })
  })
})
