import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { signParamsSync } from '@transloadit/utils/node'
import { execa } from 'execa'
import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { resolveCliConfig } from '../../../src/cli/helpers.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const { waits } = vi.hoisted((): { waits: number[] } => ({ waits: [] }))
vi.mock('execa', () => ({ execa: vi.fn(async () => undefined) }))
vi.mock('node:timers/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:timers/promises')>()
  return {
    ...original,
    setTimeout: vi.fn((ms: number, value: undefined, options: { signal?: AbortSignal }) => {
      waits.push(ms)
      return original.setTimeout(1, value, options)
    }),
  }
})

const origin = 'http://127.0.0.1:3020'
const created = {
  ok: 'CLI_DEVICE_AUTHORIZATION_CREATED',
  device_code: 'fake-device-secret',
  user_code: 'BCDF-GHJK',
  verification_url: 'https://console.example/c/cli-auth?code=BCDF-GHJK',
  expires_in: 900,
  interval: 5,
}
const authorized = {
  ok: 'CLI_DEVICE_AUTHORIZED',
  workspace: 'my-app',
  auth_key: 'combined-key',
  auth_secret: 'never-print-this-secret',
  is_allowed_for_smartcdn: true,
  scope: 'dam:write',
  signature_algo: 'sha256',
}
const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'device-login-'))
  process.chdir(directory)
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
    'TRANSLOADIT_WORKSPACE',
    'TRANSLOADIT_ENDPOINT',
  ])
    vi.stubEnv(name, '')
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
  vi.mocked(execa).mockClear()
  waits.length = 0
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
  await rm(directory, { recursive: true, force: true })
})

function login(args: string[] = []): Promise<void> {
  return main(['auth', 'login', '--endpoint', origin, ...args])
}

function createDevice(response = created): nock.Scope {
  return nock(origin)
    .post(
      '/cli/device_authorizations',
      (body) => body.client === 'transloadit-cli' && typeof body.hostname === 'string',
    )
    .reply(200, response)
}

test('device creation and token polling send form-encoded fields, not JSON', async () => {
  const api = nock(origin, {
    reqheaders: { 'content-type': 'application/x-www-form-urlencoded' },
  })
    .post(
      '/cli/device_authorizations',
      (body) => body.client === 'transloadit-cli' && typeof body.hostname === 'string',
    )
    .reply(200, created)
    .post('/cli/device_authorizations/token', { device_code: created.device_code })
    .reply(200, authorized)
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(resolveCliConfig().credentialsWorkspace).toBe(authorized.workspace)
})

test.each([
  false,
  true,
])('device login polls pending then saves the combined credential (no browser: %s)', async (noBrowser) => {
  const api = createDevice()
    .post('/cli/device_authorizations/token', { device_code: created.device_code })
    .reply(200, { ok: 'CLI_DEVICE_AUTHORIZATION_PENDING', expires_in: 890 })
    .post('/cli/device_authorizations/token', { device_code: created.device_code })
    .reply(200, authorized)
  await login(noBrowser ? ['--no-browser'] : [])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(waits).toEqual([5000, 5000])
  expect(resolveCliConfig()).toMatchObject({
    credentials: { authKey: authorized.auth_key, authSecret: authorized.auth_secret },
    credentialsWorkspace: 'my-app',
    credentialsEndpoint: origin,
  })
  expect((await stat('credentials')).mode & 0o777).toBe(0o600)
  const output = JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)
  expect(output).toContain(created.user_code)
  expect(output).toContain(created.verification_url)
  expect(output).toContain('Logged in to workspace my-app')
  expect(output).not.toContain(created.device_code)
  expect(output).not.toContain(authorized.auth_secret)
  expect(execa).toHaveBeenCalledTimes(noBrowser ? 0 : 1)
})

test('expired device authorization never saves credentials', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(404, { error: 'CLI_DEVICE_AUTHORIZATION_NOT_FOUND', message: 'unsafe device secret' })
  await login(['--no-browser'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readdir(directory)).toEqual([])
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringMatching(/expired.*auth login/),
  )
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'unsafe device secret',
  )
})

test('the saved browser credential signs the next API request with its required algorithm', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
    .post('/storage/public_prefixes')
    .reply((_uri, body) => {
      const encoded = String(body)
      const params = /name="params"\r\n\r\n([^\r\n]+)/.exec(encoded)?.[1]
      const signature = /name="signature"\r\n\r\n([^\r\n]+)/.exec(encoded)?.[1]
      const accepted =
        params !== undefined &&
        signature === signParamsSync(params, authorized.auth_secret, 'sha256')
      return accepted
        ? [
            200,
            {
              ok: 'STORAGE_PUBLIC_PREFIX_DECLARED',
              prefix: 'website/',
              created_at: '2026-09-13',
              created: true,
            },
          ]
        : [400, { error: 'INVALID_SIGNATURE' }]
    })
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  await main(['storage', 'publish', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(resolveCliConfig().credentials).toMatchObject({ signatureAlgorithm: 'sha256' })
  const credentials = resolveCliConfig().credentials
  if (credentials === undefined) throw new Error('Expected the saved combined key')
  const client = new Transloadit(credentials)
  const signed = client.calcSignature({ steps: {} })
  expect(signed.signature).toBe(signParamsSync(signed.params, authorized.auth_secret, 'sha256'))
  const override = client.calcSignature({ steps: {} }, 'sha512')
  expect(override.signature).toBe(signParamsSync(override.params, authorized.auth_secret, 'sha512'))
})

test('rate limiting slows subsequent polls and honors Retry-After', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(429, { error: 'RATE_LIMIT_REACHED' }, { 'Retry-After': '12' })
    .post('/cli/device_authorizations/token')
    .reply(200, { ok: 'CLI_DEVICE_AUTHORIZATION_PENDING', expires_in: 850 })
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(waits).toEqual([5000, 12000, 12000])
})

test('Ctrl-C cancels polling, leaves no credentials and removes its signal handler', async () => {
  const listeners = process.listeners('SIGINT')
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(() => {
      process.emit('SIGINT')
      return [200, { ok: 'CLI_DEVICE_AUTHORIZATION_PENDING', expires_in: 880 }]
    })
  await login(['--no-browser'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readdir(directory)).toEqual([])
  expect(process.listeners('SIGINT')).toEqual(listeners)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringMatching(/canceled/))
})

test('slow_down increases the interval even without Retry-After', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(400, { error: 'slow_down' })
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(waits).toEqual([5000, 10000])
})

test('an excessive Retry-After cannot overflow a Node timer into immediate polling', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(429, {}, { 'Retry-After': '4294968' })
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(waits).toEqual([5000, 900000])
})

test('the local deadline ends polling even if the server keeps reporting pending', async () => {
  const deadline = new AbortController()
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(() => {
      deadline.abort()
      return [200, { ok: 'CLI_DEVICE_AUTHORIZATION_PENDING', expires_in: 900 }]
    })
  await login(['--no-browser'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readdir(directory)).toEqual([])
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringMatching(/expired/))
})

test('existing credentials require --replace before creating a consumable authorization', async () => {
  await writeFile('credentials', 'previous\n')
  await login(['--no-browser'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('credentials', 'utf8')).toBe('previous\n')
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('--replace'))
  expect(execa).not.toHaveBeenCalled()
})

test.each([
  'file:///tmp/fake',
  'https://user:password@console.example/c/cli-auth',
  'http://console.example/c/cli-auth',
])('refuses unsafe browser target %s without launching or polling', async (verification_url) => {
  const api = createDevice({ ...created, verification_url })
  await login()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(execa).not.toHaveBeenCalled()
  expect(await readdir(directory)).toEqual([])
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    verification_url,
  )
})
