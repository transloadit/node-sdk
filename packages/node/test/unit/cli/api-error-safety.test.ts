import type { TransloaditErrorResponseBody } from '../../../src/ApiError.ts'

import fs from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

test('prints an ordinary API reason unchanged', async () => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'The form contained bad data.',
    reason: 'Use --field text_method=native for page granularity.',
  })
  expect(output).toBe(
    'err     API error INVALID_FORM_DATA: The form contained bad data. Use --field text_method=native for page granularity.',
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

test.each([
  'x',
  '📝',
])('bounds a very long reason without splitting characters (%s)', async (character) => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'Request refused.',
    reason: character.repeat(4000),
  })
  expect(output).toBe(
    `err     API error INVALID_FORM_DATA: Request refused. ${character.repeat(1999)}…`,
  )
})

test('omits a structured reason from the error line', async () => {
  const output = await report({
    error: 'INVALID_FORM_DATA',
    message: 'Request refused.',
    reason: { field: 'text_format', details: ['Use md.'] },
  })
  expect(output).toBe('err     API error INVALID_FORM_DATA: Request refused.')
})

test('notification replay shows the API reason through the shared formatter', async () => {
  const body = {
    error: 'INVALID_FORM_DATA',
    message: 'Request refused.',
    reason: 'Use a different notification URL.',
  } satisfies TransloaditErrorResponseBody
  vi.spyOn(Transloadit.prototype, 'replayAssemblyNotification').mockRejectedValue(
    new ApiError({ body }),
  )
  await main(['notifications', 'replay', 'assembly', '-l', 'err'])
  expect(console.error).toHaveBeenCalledExactlyOnceWith(
    'err    ',
    'API error INVALID_FORM_DATA: Request refused. Use a different notification URL.',
  )
})
