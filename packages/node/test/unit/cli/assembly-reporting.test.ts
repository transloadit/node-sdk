import fs from 'node:fs'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Writable } from 'node:stream'
import { format } from 'node:util'

import { Cli } from 'clipanion'
import { Options, RequestError } from 'got'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AssembliesCreateCommand } from '../../../src/cli/commands/assemblies.ts'
import {
  TemplatesCreateCommand,
  TemplatesDeleteCommand,
  TemplatesGetCommand,
  TemplatesModifyCommand,
  TemplatesSyncCommand,
} from '../../../src/cli/commands/templates.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const assemblyId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const assemblyUrl = `https://api2.transloadit.com/assemblies/${assemblyId}`
let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'transloadit-reporting-'))
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', '')
  vi.stubEnv('TRANSLOADIT_ENDPOINT', 'https://api2.transloadit.com')
  vi.spyOn(fs, 'fstatSync').mockReturnValue(await stat('/dev/null'))
  nock.disableNetConnect()
})

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.enableNetConnect()
  await rm(tempDir, { recursive: true, force: true })
})

function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return runCommand(['assemblies', 'create', ...args])
}

async function runCommand(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = vi.spyOn(console, 'log').mockImplementation(() => {})
  const stderr = vi.spyOn(console, 'error').mockImplementation(() => {})
  let parserOutput = ''
  const code = await Cli.from([
    AssembliesCreateCommand,
    TemplatesCreateCommand,
    TemplatesDeleteCommand,
    TemplatesGetCommand,
    TemplatesModifyCommand,
    TemplatesSyncCommand,
  ]).run(args, {
    stdout: new Writable({
      write(chunk, _encoding, callback) {
        parserOutput += chunk.toString()
        callback()
      },
    }),
  })
  return {
    code,
    stdout: stdout.mock.calls.map((args) => format(...args)).join('\n') + parserOutput,
    stderr: stderr.mock.calls.map((args) => format(...args)).join('\n'),
  }
}

function mockAssembly(): void {
  vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
    ok: 'ASSEMBLY_UPLOADING',
    assembly_id: assemblyId,
    assembly_ssl_url: assemblyUrl,
  })
  vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
    ok: 'ASSEMBLY_COMPLETED',
    results: {},
  })
}

describe('Assembly reporting', () => {
  it('reports the Assembly reference on stderr while preserving stdout', async () => {
    mockAssembly()

    const result = await run(['--template', 'template'])

    expect(result.code).toBe(0)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain(`Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl}`)
  })

  it.each([
    { args: [] },
    { args: ['--single-assembly'] },
  ])('includes the reference in JSON: %j', async ({ args }) => {
    mockAssembly()

    const result = await run(['--template', 'template', '-j', '-l', 'err', ...args])

    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      assembly_id: assemblyId,
      assembly_ssl_url: assemblyUrl,
      ok: 'ASSEMBLY_COMPLETED',
    })
    expect(result.stderr).toBe('')
  })

  it('summarizes ignored errors and preserves their details in JSON', async () => {
    mockAssembly()
    const ignoredErrors = [
      { step: 'resized', phase: 'meta', error: 'INVALID_FILE', message: 'Cannot read broken.jpg' },
    ]
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      ignored_errors: ignoredErrors,
      ignored_error_count: 3,
      results: {},
    })

    const result = await run(['--template', 'template', '--single-assembly', '-j'])

    expect(result.code).toBe(0)
    expect(result.stderr).toContain('3 ignored errors')
    expect(result.stderr).toContain('resized')
    expect(result.stderr).toContain('Cannot read broken.jpg')
    expect(JSON.parse(result.stdout)).toMatchObject({
      assembly_id: assemblyId,
      ignored_errors: ignoredErrors,
      ignored_error_count: 3,
    })
  })

  it('uses the error list length when no ignored error count is supplied', async () => {
    mockAssembly()
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      ignored_errors: [{ step: 'resized', error: 'INVALID_FILE' }],
      results: {},
    })

    const result = await run(['--template', 'template'])

    expect(result.code).toBe(0)
    expect(result.stderr).toContain('1 ignored error')
    expect(result.stderr).toContain('resized')
  })

  it('omits empty ignored-error details while preserving their count and JSON', async () => {
    mockAssembly()
    const ignoredErrors = [
      { error: { code: 'UNKNOWN_ERROR' } },
      { step: 'resized', error: 'INVALID_FILE' },
    ]
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      ignored_errors: ignoredErrors,
      results: {},
    })

    const result = await run(['--template', 'template', '-j'])

    expect(result.code).toBe(0)
    const warning = result.stderr.split('\n').find((line) => line.startsWith('warn '))
    expect(warning).toBe(
      `warn    2 ignored errors (Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl}): resized: INVALID_FILE`,
    )
    expect(JSON.parse(result.stdout).ignored_errors).toEqual(ignoredErrors)
  })

  it('reports invalid html wait_until once with its path and allowed values', async () => {
    const create = vi.spyOn(Transloadit.prototype, 'createAssembly')
    const stepsPath = path.join(tempDir, 'steps.json')
    await writeFile(
      stepsPath,
      JSON.stringify({
        shot: { robot: '/html/convert', url: 'https://example.com/', wait_until: 'bogus' },
      }),
    )

    const result = await run(['--steps', stepsPath])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'err     Invalid steps format: shot.wait_until: Expected one of: domcontentloaded, load, networkidle, commit',
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('uses singular wording when one validation error is omitted', async () => {
    const file = path.join(tempDir, 'steps.json')
    await writeFile(
      file,
      JSON.stringify(
        Object.fromEntries(
          Array.from({ length: 11 }, (_, index) => [
            `shot${index}`,
            { robot: '/html/convert', url: 'https://example.com/', wait_until: 'bogus' },
          ]),
        ),
      ),
    )

    const result = await run(['--steps', file])

    expect(result.code).toBe(1)
    expect(result.stderr.split('; ')).toHaveLength(11)
    expect(result.stderr).toMatch(/; 1 more validation error$/)
  })

  it('reports a template API failure once at the command boundary', async () => {
    const api = nock('https://api2.transloadit.com')
      .get('/templates/missing-template')
      .query(true)
      .reply(403, { error: 'TEMPLATE_NOT_FOUND', message: 'There was no Template found.' })

    const result = await runCommand(['templates', 'get', 'missing-template'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'err     API error (HTTP 403) TEMPLATE_NOT_FOUND: There was no Template found.',
    )
  })

  it('reports invalid template JSON once at the command boundary', async () => {
    const file = path.join(tempDir, 'invalid.json')
    await writeFile(file, '{')

    const result = await runCommand(['templates', 'create', 'name', file])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('err     Invalid steps format: expected valid JSON')
  })

  it('reports template sync API failures without inspecting the request object', async () => {
    const file = path.join(tempDir, 'template.json')
    await writeFile(file, JSON.stringify({ transloadit_template_id: '', steps: {} }))
    const api = nock('https://api2.transloadit.com')
      .post('/templates')
      .reply(403, { error: 'AUTH_DENIED', message: 'This key cannot create Templates.' })

    const result = await runCommand(['templates', 'sync', file])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'err     API error (HTTP 403) AUTH_DENIED: This key cannot create Templates.',
    )
  })

  it('reports transport failures on stderr without a stack on stdout', async () => {
    vi.spyOn(Transloadit.prototype, 'getTemplate').mockRejectedValue(
      new RequestError(
        'Connection reset by peer',
        { code: 'ECONNRESET' },
        new Options('https://api2.transloadit.com/templates/template'),
      ),
    )

    const result = await runCommand(['templates', 'get', 'template'])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('err     ECONNRESET: Connection reset by peer')
  })

  it('reports an invalid JSON API response without the signed request URL', async () => {
    const api = nock('https://api2.transloadit.com')
      .get('/templates/template')
      .query(true)
      .reply(200, 'invalid JSON')

    const result = await runCommand(['templates', 'get', 'template'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('err     ERR_BODY_PARSE_FAILURE: The API returned invalid JSON.')
  })

  it('reports every failed Template deletion once with its ID', async () => {
    const api = nock('https://api2.transloadit.com')
      .delete('/templates/first-template')
      .reply(403, { error: 'AUTH_DENIED', message: 'First Template cannot be deleted.' })
      .delete('/templates/second-template')
      .reply(403, { error: 'AUTH_DENIED', message: 'Second Template cannot be deleted.' })

    const result = await runCommand(['templates', 'delete', 'first-template', 'second-template'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr.split('\n')).toEqual([
      'err     Template first-template: API error (HTTP 403) AUTH_DENIED: First Template cannot be deleted.',
      'err     Template second-template: API error (HTTP 403) AUTH_DENIED: Second Template cannot be deleted.',
    ])
  })

  it('explains a missing Template input file on stderr', async () => {
    const file = path.join(tempDir, 'missing.json')

    const result = await runCommand(['templates', 'create', 'name', file])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('err     Cannot read Template input: ENOENT:')
    expect(result.stderr).toContain(file)
    expect(result.stderr.split('\n')).toHaveLength(1)
  })

  it('explains missing steps when modifying a Template', async () => {
    const file = path.join(tempDir, 'empty.json')
    await writeFile(file, '')
    const api = nock('https://api2.transloadit.com')
      .get('/templates/template')
      .query(true)
      .reply(200, { name: 'name', content: {} })

    const result = await runCommand(['templates', 'modify', 'template', file])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('err     No steps to update template with')
  })

  it('explains missing steps and ID when syncing a Template', async () => {
    const file = path.join(tempDir, 'empty.json')
    await writeFile(file, JSON.stringify({ transloadit_template_id: '' }))

    const result = await runCommand(['templates', 'sync', file])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(`err     Template file has no id and no steps: ${file}`)
  })

  it('keeps a sync input filesystem error on stderr after the initial scan', async () => {
    const file = path.join(tempDir, 'template.json')
    await writeFile(file, JSON.stringify({ transloadit_template_id: 'template', steps: {} }))
    vi.spyOn(fs.promises, 'stat')
      .mockResolvedValueOnce(await stat(file))
      .mockRejectedValueOnce(new Error('Template input disappeared'))

    const result = await runCommand(['templates', 'sync', file])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('err     Cannot read Template input: Template input disappeared')
  })

  it.each([
    { status: 403, error: 'TEMPLATE_NOT_FOUND' },
    { status: 404, error: 'SERVER_404' },
  ])('explains a nonexistent Template referenced by a sync file: %j', async ({ status, error }) => {
    const file = path.join(tempDir, 'missing.json')
    await writeFile(file, JSON.stringify({ transloadit_template_id: 'missing', steps: {} }))
    const api = nock('https://api2.transloadit.com')
      .get('/templates/missing')
      .query(true)
      .reply(status, { error, message: 'Template not found.' })

    const result = await runCommand(['templates', 'sync', file])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(`err     Template file references nonexistent template: ${file}`)
  })

  it('explains a missing steps input file on stderr', async () => {
    const file = path.join(tempDir, 'missing.json')

    const result = await run(['--steps', file])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('err     Cannot read steps input: ENOENT:')
    expect(result.stderr).toContain(file)
    expect(result.stderr.split('\n')).toHaveLength(1)
  })

  it.each([
    { args: [] },
    { args: ['--single-assembly'] },
  ])('formats real HTTP 400 errors concisely: %j', async ({ args }) => {
    const api = nock('https://api2.transloadit.com')
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(400, {
        error: 'TEMPLATE_NOT_FOUND',
        message: 'There was no Template found.',
        assembly_id: assemblyId,
        assembly_ssl_url: assemblyUrl,
      })

    const result = await run(['--template', 'missing-template', ...args])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr.split('\n')).toHaveLength(1)
    expect(result.stderr).toContain('TEMPLATE_NOT_FOUND: There was no Template found.')
    expect(result.stderr).toContain(assemblyUrl)
  })

  it('reports the request Assembly URL when the HTTP error body omits it', async () => {
    let requestUrl = ''
    const api = nock('https://api2.transloadit.com')
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply((uri) => {
        requestUrl = `https://api2.transloadit.com${uri}`
        return [400, { error: 'TEMPLATE_NOT_FOUND', message: 'There was no Template found.' }]
      })

    const result = await run(['--template', 'missing-template'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stderr.split('\n')).toHaveLength(1)
    expect(result.stderr).toContain(`Assembly URL: ${requestUrl}`)
  })

  it('preserves file bytes on stdout with --json --output -', async () => {
    mockAssembly()
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      results: { imported: [{ name: 'file.txt', url: 'http://downloads.test/file.txt' }] },
    })
    nock('http://downloads.test').get('/file.txt').reply(200, 'file contents')
    let streamed = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      streamed += String(chunk)
      return true
    })

    const result = await run(['--template', 'template', '-j', '-o', '-'])

    expect(result.code).toBe(0)
    expect(result.stdout).toBe('')
    expect(streamed).toBe('file contents')
    expect(result.stderr).toContain(assemblyUrl)
  })

  it('keeps --json --print-urls as one document with Assembly metadata', async () => {
    mockAssembly()
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      results: { imported: [{ name: 'file.txt', url: 'https://results.test/file.txt' }] },
    })

    const result = await run(['--template', 'template', '-j', '--print-urls'])

    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      urls: [
        { assemblyId, step: 'imported', name: 'file.txt', url: 'https://results.test/file.txt' },
      ],
      assemblies: [{ assembly_id: assemblyId, assembly_ssl_url: assemblyUrl }],
    })
  })

  it('includes the Assembly URL only once in polling error diagnostics', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_UPLOADING',
      assembly_id: assemblyId,
      assembly_ssl_url: assemblyUrl,
    })
    const api = nock('https://api2.transloadit.com')
      .get(`/assemblies/${assemblyId}`)
      .query(true)
      .reply(403, {
        error: 'ASSEMBLY_NOT_FOUND',
        message: 'The Assembly could not be accessed.',
      })

    const result = await run(['--template', 'template'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    const diagnostic = result.stderr.split('\n').find((line) => line.startsWith('err ')) ?? ''
    expect(diagnostic).toContain('ASSEMBLY_NOT_FOUND: The Assembly could not be accessed.')
    expect(diagnostic.split(assemblyUrl)).toHaveLength(2)
  })

  it('redacts invalid JSON polling responses while preserving the Assembly reference', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_UPLOADING',
      assembly_id: assemblyId,
      assembly_ssl_url: assemblyUrl,
    })
    const api = nock('https://api2.transloadit.com')
      .get(`/assemblies/${assemblyId}`)
      .query(true)
      .reply(200, 'invalid JSON')

    const result = await run(['--template', 'template', '-l', 'err'])

    expect(api.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      `err     ERR_BODY_PARSE_FAILURE: The API returned invalid JSON. (Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl})`,
    )
  })

  it.each([
    { args: [] },
    { args: ['--single-assembly'] },
  ])('preserves the accepted Assembly reference when uploading fails: %j', async ({ args }) => {
    const file = path.join(tempDir, 'input.txt')
    await writeFile(file, 'input')
    const api = nock('https://api2.transloadit.com')
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, {
        ok: 'ASSEMBLY_UPLOADING',
        assembly_id: assemblyId,
        assembly_ssl_url: assemblyUrl,
        tus_url: 'https://uploads.test/files',
      })
    const upload = nock('https://uploads.test').post('/files').reply(403, 'Access denied.')

    const result = await run(['--template', 'template', '-i', file, '-l', 'err', ...args])

    expect(api.isDone()).toBe(true)
    expect(upload.isDone()).toBe(true)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain(`Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl}`)
    expect(result.stderr.split('\n')).toHaveLength(1)
  })

  it.each([
    { args: [] },
    { args: ['--single-assembly'] },
  ])('preserves the attempted Assembly reference on a creation reset: %j', async ({ args }) => {
    const error = new RequestError(
      'Connection reset by peer',
      { code: 'ECONNRESET' },
      new Options(assemblyUrl),
    )
    const create = vi
      .spyOn(Transloadit.prototype, 'createAssembly')
      .mockImplementation(() => Object.assign(Promise.reject(error), { assemblyId }))

    const result = await run(['--template', 'template', '-l', 'err', ...args])

    expect(create).toHaveBeenCalledOnce()
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      `err     ECONNRESET: Connection reset by peer (Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl})`,
    )
  })

  it.each([
    'S3_STORE_ACCESS_DENIED',
    'TIGRIS_STORE_ACCESS_DENIED',
  ])('reports a terminal %s with its message and reference', async (error) => {
    mockAssembly()
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      error,
      message: 'The storage credentials do not allow access to this bucket.',
    })

    const result = await run(['--template', 'template', '-j'])

    expect(result.code).toBe(1)
    expect(result.stderr.split('\n')).toHaveLength(2)
    expect(result.stderr).toContain(
      `Assembly failed: ${error}: The storage credentials do not allow access to this bucket. (Assembly ID: ${assemblyId}, Assembly URL: ${assemblyUrl})`,
    )
    expect(JSON.parse(result.stdout)).toMatchObject({
      assembly_id: assemblyId,
      assembly_ssl_url: assemblyUrl,
      error,
      message: 'The storage credentials do not allow access to this bucket.',
    })
  })
})
