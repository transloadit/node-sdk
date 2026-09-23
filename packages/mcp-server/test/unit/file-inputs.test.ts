import type { AssemblyStatus } from '@transloadit/node'

import type { TransloaditMcpHttpOptions } from '../../src/http.ts'

import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Transloadit } from '@transloadit/node'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'

describe('MCP file inputs', () => {
  const fixtureContent = 'Harmless MCP regression fixture'
  const assemblyId = '0123456789abcdef0123456789abcdef'
  const assemblyUrl = `https://api2.transloadit.com/assemblies/${assemblyId}`
  let fixtureDirectory: string
  let fixturePath: string
  let privateDownloads = 0
  const serverOptions: TransloaditMcpHttpOptions = { metricsPath: false }
  const handler = createTransloaditMcpHttpHandler(serverOptions)
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
    delete serverOptions.authKey
    delete serverOptions.authSecret
    delete serverOptions.endpoint
    delete serverOptions.mcpToken
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
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
    })
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
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
    nock.cleanAll()
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
        assembly_url: assemblyUrl,
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
        assembly_url: assemblyUrl,
        files: [{ kind: 'base64', field: 'file', base64: 'aGk=', filename: 'hello.txt' }],
        wait_for_completion: true,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.resumeAssemblyUploads).toHaveBeenCalledWith(
      expect.objectContaining({
        assemblyUrl,
        files: { file: expect.any(String) },
        waitForCompletion: true,
      }),
    )
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it.each([
    'transloadit_create_assembly',
    'transloadit_get_assembly_status',
    'transloadit_wait_for_assembly',
  ])('rejects a private Assembly URL in %s before any API operation', async (name) => {
    const result = await client.callTool({
      name,
      arguments: { assembly_url: `${origin}/assemblies/${assemblyId}` },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args', path: 'assembly_url' }],
    })
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
    expect(Transloadit.prototype.getAssembly).not.toHaveBeenCalled()
    expect(Transloadit.prototype.awaitAssemblyCompletion).not.toHaveBeenCalled()
  })

  it.each([
    `https://example.com/assemblies/${assemblyId}`,
    `https://api2.transloadit.com.example.com/assemblies/${assemblyId}`,
    `https://api2.transloadit.com@127.0.0.1/assemblies/${assemblyId}`,
    `https://user:password@api2.transloadit.com/assemblies/${assemblyId}`,
    `https://api2.transloadit.com:8443/assemblies/${assemblyId}`,
    `file:///assemblies/${assemblyId}`,
    `${assemblyUrl}?redirect=https://example.com`,
    `${assemblyUrl}#fragment`,
    'https://api2.transloadit.com/assemblies/%2e%2e%2ftemplates',
    'not a URL',
  ])('rejects an unsafe Assembly reference: %s', async (url) => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: { assembly_url: url, instructions: { template_id: 'test-template' } },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args', path: 'assembly_url' }],
    })
    expect(Transloadit.prototype.getTemplate).not.toHaveBeenCalled()
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
  })

  it('resolves a regional Assembly URL through the configured API endpoint', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: `http://api2-eu-west-1.transloadit.com/assemblies/${assemblyId}`,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.resumeAssemblyUploads).toHaveBeenCalledWith(
      expect.objectContaining({ assemblyUrl }),
    )
  })

  it('polls through the configured API endpoint for a regional Assembly URL', async () => {
    const result = await client.callTool({
      name: 'transloadit_wait_for_assembly',
      arguments: {
        assembly_url: `https://api2-eu-west-1.transloadit.com/assemblies/${assemblyId}`,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.awaitAssemblyCompletion).toHaveBeenCalledWith(
      assemblyId,
      expect.objectContaining({ assemblyUrl }),
    )
  })

  it.each([
    'transloadit_create_assembly',
    'transloadit_wait_for_assembly',
  ])('sends credentials only to the configured API when %s receives a regional URL', async (name) => {
    vi.mocked(Transloadit.prototype.resumeAssemblyUploads).mockRestore()
    vi.mocked(Transloadit.prototype.awaitAssemblyCompletion).mockRestore()
    const api = nock('https://api2.transloadit.com', {
      reqheaders: { authorization: 'Bearer regression-test-token' },
    })
      .get(`/assemblies/${assemblyId}`)
      .query(true)
      .times(name === 'transloadit_create_assembly' ? 2 : 1)
      .reply(200, {
        ok: 'ASSEMBLY_COMPLETED',
        assembly_id: assemblyId,
        assembly_url: assemblyUrl,
        assembly_ssl_url: assemblyUrl,
      })
    const callerHost = nock('http://api2-eu-west-1.transloadit.com')
      .get(`/assemblies/${assemblyId}`)
      .query(true)
      .reply(302, undefined, { Location: `${origin}/fixture` })
    const result = await client.callTool({
      name,
      arguments: {
        assembly_url: `http://api2-eu-west-1.transloadit.com/assemblies/${assemblyId}`,
      },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
    expect(callerHost.isDone()).toBe(false)
    expect(privateDownloads).toBe(0)
  })

  it('supports an explicitly configured local API with a path prefix', async () => {
    serverOptions.endpoint = `${origin}/api`
    const configuredAssemblyUrl = `${origin}/api/assemblies/${assemblyId}`
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: { assembly_url: configuredAssemblyUrl },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.resumeAssemblyUploads).toHaveBeenCalledWith(
      expect.objectContaining({ assemblyUrl: configuredAssemblyUrl }),
    )
  })

  it.each([
    'transloadit_create_assembly',
    'transloadit_get_assembly_status',
    'transloadit_wait_for_assembly',
  ])('does not follow API redirects when %s accesses an Assembly', async (name) => {
    vi.mocked(Transloadit.prototype.resumeAssemblyUploads).mockRestore()
    vi.mocked(Transloadit.prototype.getAssembly).mockRestore()
    vi.mocked(Transloadit.prototype.awaitAssemblyCompletion).mockRestore()
    const api = nock('https://api2.transloadit.com')
      .get(`/assemblies/${assemblyId}`)
      .query(true)
      .times(name === 'transloadit_create_assembly' ? 2 : 1)
      .reply(
        302,
        {
          ok: 'ASSEMBLY_COMPLETED',
          assembly_id: assemblyId,
          assembly_url: assemblyUrl,
          assembly_ssl_url: assemblyUrl,
        },
        { Location: `${origin}/fixture` },
      )
    const result = await client.callTool({
      name,
      arguments: { assembly_url: assemblyUrl },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
    expect(privateDownloads).toBe(0)
  })

  it('does not follow a redirect_url response when creating an Assembly', async () => {
    vi.mocked(Transloadit.prototype.createAssembly).mockRestore()
    const api = nock('https://api2.transloadit.com')
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(
        302,
        {
          ok: 'ASSEMBLY_COMPLETED',
          assembly_id: assemblyId,
          assembly_url: assemblyUrl,
          assembly_ssl_url: assemblyUrl,
        },
        { Location: `${origin}/fixture` },
      )
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: { instructions: { redirect_url: `${origin}/fixture` } },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
    expect(privateDownloads).toBe(0)
  })

  it('also disables API redirects with configured key and secret credentials', async () => {
    serverOptions.authKey = 'regression-key'
    serverOptions.authSecret = 'regression-secret'
    serverOptions.mcpToken = 'regression-test-token'
    vi.mocked(Transloadit.prototype.getAssembly).mockRestore()
    const api = nock('https://api2.transloadit.com')
      .get(`/assemblies/${assemblyId}`)
      .query((query) => typeof query.signature === 'string')
      .reply(
        302,
        {
          ok: 'ASSEMBLY_COMPLETED',
          assembly_id: assemblyId,
          assembly_url: assemblyUrl,
          assembly_ssl_url: assemblyUrl,
        },
        { Location: `${origin}/fixture` },
      )
    const result = await client.callTool({
      name: 'transloadit_get_assembly_status',
      arguments: { assembly_id: assemblyId },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
    expect(privateDownloads).toBe(0)
  })

  it('fetches status by a valid Assembly ID', async () => {
    const result = await client.callTool({
      name: 'transloadit_get_assembly_status',
      arguments: { assembly_id: assemblyId },
    })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(Transloadit.prototype.getAssembly).toHaveBeenCalledWith(assemblyId)
  })

  it.each([
    'transloadit_get_assembly_status',
    'transloadit_wait_for_assembly',
  ])('rejects an injected Assembly ID in %s', async (name) => {
    const result = await client.callTool({
      name,
      arguments: { assembly_id: '../templates?redirect=https://example.com' },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args', path: 'assembly_id' }],
    })
    expect(Transloadit.prototype.getAssembly).not.toHaveBeenCalled()
    expect(Transloadit.prototype.awaitAssemblyCompletion).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    { steps: { source: { robot: '/http/import' } } },
  ])('resumes a public URL upload with instructions %j', async (instructions) => {
    const download = nock('http://198.51.100.10').get('/fixture.txt').reply(200, fixtureContent)
    let uploadedContent: string | undefined
    vi.mocked(Transloadit.prototype.resumeAssemblyUploads).mockImplementation(async (options) => {
      const file = options.files?.file
      if (file == null) throw new Error('Expected a prepared upload')
      uploadedContent = await readFile(file, 'utf8')
      return { ok: 'ASSEMBLY_COMPLETED' }
    })
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: assemblyUrl,
        instructions,
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/fixture.txt' }],
        wait_for_completion: true,
      },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      upload: { status: 'complete', total_files: 1, resumed: true },
    })
    expect(uploadedContent).toBe(fixtureContent)
    expect(download.isDone()).toBe(true)
  })

  it('rejects a private URL file during resumption before downloading', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: assemblyUrl,
        files: [{ kind: 'url', field: 'file', url: `${origin}/fixture` }],
      },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_args' }],
    })
    expect(privateDownloads).toBe(0)
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
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
      arguments: {
        instructions: { steps: { ':original': { robot: '/upload/handle' } } },
        files: [{ kind: 'url', field: 'file', url: `${origin}/fixture` }],
      },
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
      arguments: {
        instructions: { steps: { ':original': { robot: '/upload/handle' } } },
        files: [{ kind: 'url', field: 'file', url: `file://${fixturePath}` }],
      },
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
