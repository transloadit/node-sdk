import type { AssemblyStatus } from '@transloadit/node'

import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Transloadit } from '@transloadit/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'

describe('MCP file inputs', () => {
  const fixtureContent = 'Harmless MCP regression fixture'
  let fixtureDirectory: string
  let fixturePath: string
  let privateDownloads = 0
  const handler = createTransloaditMcpHttpHandler({ metricsPath: false })
  const httpServer = createServer((request, response) => {
    if (request.url === '/fixture') {
      privateDownloads += 1
      response.end(fixtureContent)
      return
    }
    void handler(request, response)
  })
  let client: Client
  let origin: string

  beforeEach(async () => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), 'mcp-test-'))
    fixturePath = join(fixtureDirectory, 'fixture.txt')
    await writeFile(fixturePath, fixtureContent)
    await symlink(fixturePath, join(fixtureDirectory, 'link.txt'))
    privateDownloads = 0
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
    })
    vi.spyOn(Transloadit.prototype, 'resumeAssemblyUploads').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
    })
    vi.spyOn(Transloadit.prototype, 'getTemplate').mockRejectedValue(
      new Error('Unexpected template lookup'),
    )
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const address = httpServer.address()
    if (address == null || typeof address === 'string') {
      throw new Error('Expected a TCP listener')
    }
    origin = `http://127.0.0.1:${address.port}`
    client = new Client({ name: 'mcp-regression', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
        requestInit: { headers: { Authorization: 'Bearer regression-test-token' } },
      }),
    )
  })

  afterEach(async () => {
    await client?.close()
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    vi.restoreAllMocks()
    await rm(fixtureDirectory, { recursive: true, force: true })
  })

  it('advertises only base64 and URL file inputs', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((entry) => entry.name === 'transloadit_create_assembly')
    expect(tool).toBeDefined()
    const schema = JSON.stringify(tool?.inputSchema.properties?.files)
    expect(schema).toContain('base64')
    expect(schema).toContain('url')
    expect(schema).not.toContain('"path"')
  })

  it.each([
    'absolute',
    'relative',
    'symlink',
    'missing',
  ])('rejects %s paths before template lookup or Assembly creation', async (variant) => {
    const paths: Record<string, string> = {
      absolute: fixturePath,
      relative: relative(process.cwd(), fixturePath),
      symlink: join(fixtureDirectory, 'link.txt'),
      missing: join(fixtureDirectory, 'missing.txt'),
    }
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: { template_id: 'test-template' },
        files: [{ kind: 'path', field: 'file', path: paths[variant] }],
        wait_for_completion: true,
      },
    })
    expect(result.isError).toBe(true)
    expect(Transloadit.prototype.getTemplate).not.toHaveBeenCalled()
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
  })

  it.each([
    'await',
    'background',
    'none',
  ])('rejects mixed inputs when resuming with %s', async (mode) => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: `${origin}/assemblies/test`,
        upload_behavior: mode,
        files: [
          { kind: 'base64', field: 'supplied', base64: 'aGk=', filename: 'supplied.txt' },
          { kind: 'path', field: 'local', path: fixturePath },
        ],
      },
    })
    expect(result.isError).toBe(true)
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
  })

  it('uploads only the supplied base64 bytes, even with a path-like filename', async () => {
    let uploadedContent: string | undefined
    vi.mocked(Transloadit.prototype.createAssembly).mockImplementation((options) => {
      const file = options?.files?.file
      if (file == null) throw new Error('Expected a prepared upload')
      const response: Promise<AssemblyStatus> = readFile(file, 'utf8').then((content) => {
        uploadedContent = content
        return { ok: 'ASSEMBLY_COMPLETED' }
      })
      return Object.assign(response, { assemblyId: 'test-assembly' })
    })
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        files: [
          {
            kind: 'base64',
            field: 'file',
            base64: Buffer.from('Customer supplied bytes').toString('base64'),
            filename: fixturePath,
          },
        ],
        wait_for_completion: true,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(uploadedContent).toBe('Customer supplied bytes')
    expect(await readFile(fixturePath, 'utf8')).toBe(fixtureContent)
  })

  it('resumes uploads with base64 input', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: `${origin}/assemblies/test`,
        files: [{ kind: 'base64', field: 'file', base64: 'aGk=', filename: 'hello.txt' }],
        wait_for_completion: true,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.resumeAssemblyUploads).toHaveBeenCalledWith(
      expect.objectContaining({
        assemblyUrl: `${origin}/assemblies/test`,
        files: { file: expect.any(String) },
        waitForCompletion: true,
      }),
    )
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it('returns a sanitized error if a prepared upload disappears', async () => {
    vi.mocked(Transloadit.prototype.createAssembly).mockRejectedValue(
      Object.assign(new Error(`ENOENT: ${fixturePath}`), { code: 'ENOENT' }),
    )
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        files: [{ kind: 'base64', field: 'file', base64: 'aGk=', filename: 'hello.txt' }],
        wait_for_completion: true,
      },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [
        {
          code: 'mcp_file_not_found',
          message: 'A prepared upload is no longer available.',
          hint: 'Retry with base64 or a public URL, or upload via `npx -y @transloadit/node upload`.',
        },
      ],
    })
  })

  it('suggests supported alternatives when a base64 upload exceeds the limit', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        files: [
          {
            kind: 'base64',
            field: 'file',
            base64: Buffer.alloc(512_001).toString('base64'),
            filename: 'large.bin',
          },
        ],
      },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [
        {
          code: 'mcp_base64_too_large',
          hint: 'Use a public URL import or upload from your own machine instead.',
        },
      ],
    })
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it('rejects downloads from the local network before making the request', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: { files: [{ kind: 'url', field: 'file', url: `${origin}/fixture` }] },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args' }],
    })
    expect(privateDownloads).toBe(0)
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it('rejects file URLs', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: { files: [{ kind: 'url', field: 'file', url: `file://${fixturePath}` }] },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args' }],
    })
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it('preserves public URL imports', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: { steps: { source: { robot: '/http/import' } } },
        files: [{ kind: 'url', field: 'file', url: 'https://example.com/fixture.txt' }],
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.createAssembly).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          steps: { source: { robot: '/http/import', url: 'https://example.com/fixture.txt' } },
        }),
      }),
    )
  })
})
