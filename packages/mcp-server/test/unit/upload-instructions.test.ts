import type { AddressInfo } from 'node:net'

import type { TransloaditMcpHttpOptions } from '../../src/http.ts'

import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Transloadit } from '@transloadit/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

const assemblyId = '0123456789abcdef0123456789abcdef'
const assemblyUrl = `https://api2.transloadit.com/assemblies/${assemblyId}`
const hasCurl = spawnSync('curl', ['--version']).status === 0

// Async on purpose: the tus stub runs in this process, so a synchronous spawn would deadlock.
const runBash = promisify(execFile)

type RecordedUpload = { headers: Record<string, string | string[] | undefined>; body: Buffer }

const decodeMetadata = (header: string): Record<string, string> =>
  Object.fromEntries(
    header.split(',').map((pair) => {
      const [key, value = ''] = pair.split(' ')
      return [key, Buffer.from(value, 'base64').toString('utf8')]
    }),
  )

describe('upload_instructions for files that exist only in the caller sandbox', () => {
  const serverOptions: TransloaditMcpHttpOptions = { metricsPath: false }
  const handler = createTransloaditMcpHttpHandler(serverOptions)
  const recorded: RecordedUpload[] = []
  // One listener serves the MCP endpoint and a tus stub, like a sandbox would reach Transloadit.
  const httpServer = createServer((req, res) => {
    if (req.url?.startsWith('/resumable/files/')) {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        recorded.push({ headers: req.headers, body: Buffer.concat(chunks) })
        res.writeHead(201, { 'Upload-Offset': String(Buffer.concat(chunks).length) })
        res.end()
      })
      return
    }
    void handler(req, res)
  })
  let origin: string
  let client: Client

  const connect = async (headers: Record<string, string> = {}): Promise<void> => {
    client = new Client({ name: 'upload-instructions', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { requestInit: { headers } }),
    )
  }

  const createWithExpectedUploads = async (args: Record<string, unknown>) =>
    parseToolPayload(
      await client.callTool({
        name: 'transloadit_create_assembly',
        arguments: {
          instructions: { steps: { ':original': { robot: '/upload/handle' } } },
          ...args,
        },
      }),
    )

  beforeEach(async () => {
    delete serverOptions.authKey
    delete serverOptions.authSecret
    delete serverOptions.upstreamSecret
    recorded.length = 0
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    origin = `http://127.0.0.1:${port}`
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_UPLOADING',
      assembly_id: assemblyId,
      assembly_ssl_url: assemblyUrl,
      tus_url: `${origin}/resumable/files/`,
    })
  })

  afterEach(async () => {
    await client?.close()
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    vi.restoreAllMocks()
  })

  it('returns one tus upload per expected file and does not wait for them', async () => {
    await connect({ Authorization: 'Bearer forwarded-token' })

    const payload = await createWithExpectedUploads({
      expected_uploads: 2,
      wait_for_completion: true,
    })

    expect(payload.upload_instructions).toEqual([
      {
        fieldname: 'file_1',
        tus_endpoint: `${origin}/resumable/files/`,
        metadata: { assembly_url: assemblyUrl, fieldname: 'file_1' },
        curl: expect.stringContaining(`-X POST '${origin}/resumable/files/'`),
      },
      {
        fieldname: 'file_2',
        tus_endpoint: `${origin}/resumable/files/`,
        metadata: { assembly_url: assemblyUrl, fieldname: 'file_2' },
        curl: expect.stringContaining("-H 'Tus-Resumable: 1.0.0'"),
      },
    ])
    expect(payload.next_steps).toEqual(['transloadit_wait_for_assembly'])
    expect(payload.warnings).toEqual([
      expect.objectContaining({ code: 'mcp_wait_skipped_for_uploads' }),
    ])
    expect(Transloadit.prototype.createAssembly).toHaveBeenCalledWith(
      expect.objectContaining({ expectedUploads: 2, waitForCompletion: false }),
    )
  })

  it('counts files sent in the same call against the expected uploads', async () => {
    await connect({ Authorization: 'Bearer forwarded-token' })

    const payload = await createWithExpectedUploads({
      expected_uploads: 2,
      files: [{ kind: 'base64', field: 'inline', base64: 'aGk=', filename: 'inline.txt' }],
    })

    expect(payload.upload_instructions).toHaveLength(1)
  })

  it('returns no upload instructions without expected_uploads', async () => {
    await connect({ Authorization: 'Bearer forwarded-token' })

    const payload = await createWithExpectedUploads({})

    expect(payload.upload_instructions).toBeUndefined()
  })

  it.skipIf(!hasCurl)(
    'gives a curl command that uploads any filename with tus creation-with-upload',
    async () => {
      await connect({ Authorization: 'Bearer forwarded-token' })
      const payload = await createWithExpectedUploads({ expected_uploads: 1 })
      const [instruction] = payload.upload_instructions as Array<{ curl: string }>
      const directory = await mkdtemp(join(tmpdir(), 'mcp-sandbox-'))
      const filePath = join(directory, 'snow flake é.png')
      await writeFile(filePath, Buffer.from('fake image bytes é'))

      // Agents replace the FILE placeholder with their path, like this.
      const script = instruction.curl.replace("FILE='/path/to/the/file'", `FILE='${filePath}'`)
      const run = await runBash('bash', ['-c', script], { timeout: 20000 })
      const fileBytes = await readFile(filePath)
      await rm(directory, { recursive: true, force: true })

      expect(run.stdout.trim()).toBe('201')
      expect(recorded).toHaveLength(1)
      const [upload] = recorded
      expect(upload?.headers['tus-resumable']).toBe('1.0.0')
      expect(upload?.headers['content-type']).toBe('application/offset+octet-stream')
      expect(upload?.headers['upload-length']).toBe(String(fileBytes.length))
      expect(decodeMetadata(String(upload?.headers['upload-metadata']))).toEqual({
        assembly_url: assemblyUrl,
        fieldname: 'file_1',
        filename: 'snow flake é.png',
      })
      expect(upload?.body.equals(fileBytes)).toBe(true)
    },
  )

  it.each([
    ['a forwarded bearer token', { Authorization: 'Bearer forwarded-secret-token' }],
    ['server-side Auth Key credentials', {}],
  ])('never puts credentials into the instructions with %s', async (_kind, headers) => {
    serverOptions.authKey = 'auth-key-0123'
    serverOptions.authSecret = 'auth-secret-4567'
    serverOptions.upstreamSecret = 'upstream-secret-89'
    await connect(headers)

    const payload = await createWithExpectedUploads({ expected_uploads: 1 })
    const instructions = JSON.stringify(payload.upload_instructions)

    expect(instructions).toContain('file_1')
    for (const secret of [
      'forwarded-secret-token',
      'auth-key-0123',
      'auth-secret-4567',
      'upstream-secret-89',
    ]) {
      expect(instructions).not.toContain(secret)
    }
  })
})
