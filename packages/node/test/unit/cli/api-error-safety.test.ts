import type { TransloaditErrorResponseBody } from '../../../src/ApiError.ts'

import fs from 'node:fs'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { format } from 'node:util'

import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ApiError } from '../../../src/ApiError.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'api-error-safety-'))
  process.chdir(directory)
  vi.stubEnv('TRANSLOADIT_KEY', 'invocation-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'invocation-secret')
  vi.stubEnv('TRANSLOADIT_AUTH_KEY', '')
  vi.stubEnv('TRANSLOADIT_AUTH_SECRET', '')
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', 'invocation-token')
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  vi.spyOn(fs, 'fstatSync').mockReturnValue(await stat('/dev/null'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  nock.disableNetConnect()
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.enableNetConnect()
  for (const listener of process.stdout.listeners('error'))
    if (!stdoutListeners.includes(listener)) process.stdout.off('error', listener)
  for (const listener of process.stderr.listeners('error'))
    if (!stderrListeners.includes(listener)) process.stderr.off('error', listener)
  await rm(directory, { force: true, recursive: true })
})

async function report(body: TransloaditErrorResponseBody): Promise<string> {
  vi.spyOn(Transloadit.prototype, 'createAssembly').mockRejectedValue(new ApiError({ body }))
  await main(['assemblies', 'create', '--template', 'builtin/extract-text', '-l', 'err'])
  expect(process.exitCode).toBe(1)
  expect(console.log).not.toHaveBeenCalled()
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => format(...args))
    .join('\n')
}

test('redacts invocation credentials in the response message and a signed URL reason', async () => {
  const output = await report({
    error: 'INVALID_SIGNATURE',
    message: 'Rejected invocation-key using invocation-secret and invocation-token.',
    reason: 'Request rejected: https://example.test/file?sig=invocation-token&other=unknown-value',
  })
  expect(output).toBe(
    'err     API error INVALID_SIGNATURE: Rejected [redacted] using [redacted] and [redacted]. Request rejected: https://example.test/file?sig=[redacted]&other=unknown-value',
  )
})

test('removes ANSI and OSC sequences and flattens controls in the message and reason', async () => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'Unsafe \u001b[31mmessage\u001b[0m\ncontinued.',
    reason: 'Rejected \u001b[2Jrequest.\nerr\tforged.\u001b]0;title\u0007',
  })
  expect(output).toBe(
    'err     API error INVALID_FORM_DATA: Unsafe message continued. Rejected request. err forged.',
  )
})

test('prints an ordinary reason unchanged', async () => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'The form contained bad data.',
    reason: 'Use --field text_method=native for page granularity.',
  })
  expect(output).toBe(
    'err     API error INVALID_FORM_DATA: The form contained bad data. Use --field text_method=native for page granularity.',
  )
})

test('bounds long reasons after redacting credentials', async () => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'The form contained bad data.',
    reason: `invocation-secret: ${'x'.repeat(4000)}`,
  })
  expect(output).toContain('The form contained bad data. [redacted]: ')
  expect(output.length).toBeLessThanOrEqual(2100)
  expect(output.endsWith('…')).toBe(true)
})

test('redacts a credential completed by the truncation ellipsis', async () => {
  vi.stubEnv('TRANSLOADIT_SECRET', 'invocation-secret…')
  const prefix = 'API error INVALID_SIGNATURE: '
  const padding = 'x'.repeat(1999 - prefix.length - 'invocation-secret'.length)
  const output = await report({
    error: 'INVALID_SIGNATURE',
    message: `${padding}invocation-secret extra`,
  })
  expect(output).toBe(`err     ${prefix}${padding}[redacted]`)
})

test('withholds a diagnostic when the redaction marker is itself a credential', async () => {
  vi.stubEnv('TRANSLOADIT_SECRET', '[redacted]')
  const output = await report({ error: 'INVALID_SIGNATURE', message: 'Rejected [redacted].' })
  expect(output).toBe('err     ')
})

test('sanitizes response messages when there is no text reason', async () => {
  const output = await report({
    error: 'INVALID_SIGNATURE',
    message: 'Rejected \u001b[2Jinvocation-secret\nagain.',
  })
  expect(output).toBe('err     API error INVALID_SIGNATURE: Rejected [redacted] again.')
})

test('redacts credentials rejoined when terminal formatting is removed', async () => {
  const output = await report({
    error: 'INVALID_SIGNATURE',
    message: 'Request refused.',
    reason: 'Use invocation-\u001b[31msecret\u001b[0m.',
  })
  expect(output).toBe('err     API error INVALID_SIGNATURE: Request refused. Use [redacted].')
})

test('redacts a credential completed by joining the response message and reason', async () => {
  vi.stubEnv('TRANSLOADIT_SECRET', 'joined credential')
  vi.spyOn(Transloadit.prototype, 'getTemplate').mockRejectedValue(
    new ApiError({
      body: { error: 'INVALID_SIGNATURE', message: 'Rejected joined', reason: 'credential.' },
    }),
  )
  await main(['templates', 'get', 'template', '-l', 'err'])
  expect(process.exitCode).toBe(1)
  expect(console.error).toHaveBeenCalledExactlyOnceWith(
    'err    ',
    'API error INVALID_SIGNATURE: Rejected [redacted].',
  )
})

test('redacts stdin credentials when verification fails', async () => {
  vi.spyOn(process.stdin, Symbol.asyncIterator).mockImplementation(() =>
    Readable.from([Buffer.from('TRANSLOADIT_KEY=stdin-key\nTRANSLOADIT_SECRET=stdin-secret\n')])[
      Symbol.asyncIterator
    ](),
  )
  vi.spyOn(Transloadit.prototype, 'listTemplates').mockRejectedValue(
    new ApiError({
      body: {
        error: 'INVALID_SIGNATURE',
        message: 'Rejected stdin-secret.',
        reason: 'Use stdin-key with stdin-secret.',
      },
    }),
  )
  await main(['auth', 'login', '--stdin', '--endpoint', 'http://127.0.0.1:3020', '-l', 'err'])
  expect(process.exitCode).toBe(1)
  expect(console.error).toHaveBeenCalledExactlyOnceWith(
    'err    ',
    expect.stringContaining('Nothing was saved. Use [redacted] with [redacted].'),
  )
})

test('redacts selected file credentials through the Storage wrapper', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', '')
  vi.stubEnv('TRANSLOADIT_SECRET', '')
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', '')
  await writeFile('credentials', 'TRANSLOADIT_KEY=file-key\nTRANSLOADIT_SECRET=file-secret\n')
  vi.spyOn(Transloadit.prototype, 'listStoredAssets').mockRejectedValue(
    new ApiError({
      body: {
        error: 'INVALID_SIGNATURE',
        message: 'The request was refused.',
        reason: 'Rejected file-key using file-secret.',
      },
    }),
  )
  await main(['storage', 'ls', 'website/', '--endpoint', 'http://storage.invalid', '-l', 'err'])
  expect(process.exitCode).toBe(1)
  expect(console.error).toHaveBeenCalledExactlyOnceWith(
    'err    ',
    'Storage listing failed. Check the Storage API at http://storage.invalid and the Auth Key dam:read or dam:write scope. Rejected [redacted] using [redacted].',
  )
})
