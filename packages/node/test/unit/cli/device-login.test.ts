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
vi.mock('execa', () => ({
  execa: vi.fn(() => Object.assign(Promise.resolve(undefined), { unref: vi.fn() })),
}))
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
  vi.spyOn(OutputCtl.prototype, 'warn').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'notice').mockImplementation(() => {})
  vi.mocked(execa).mockClear()
  waits.length = 0
  nock.disableNetConnect()
  vi.spyOn(Transloadit.prototype, 'listPublicStoragePrefixes').mockResolvedValue({
    ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
    public_prefixes: [],
  })
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.useRealTimers()
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

test.each([
  200, 403,
])('reports a long approval wait on stderr and stops after HTTP %s', async (status) => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(() => {
      vi.advanceTimersByTime(60_000)
      return [200, { ok: 'CLI_DEVICE_AUTHORIZATION_PENDING', expires_in: 840 }]
    })
    .post('/cli/device_authorizations/token')
    .reply(() => {
      vi.advanceTimersByTime(60_000)
      return [status, status === 200 ? authorized : { error: 'DENIED' }]
    })
  await login(['--no-browser', '--json'])
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.notice).toHaveBeenNthCalledWith(
    1,
    'Still waiting for approval, 14 minutes left. Use the verification URL printed above.',
  )
  expect(OutputCtl.prototype.notice).toHaveBeenNthCalledWith(
    2,
    'Still waiting for approval, 13 minutes left. Use the verification URL printed above.',
  )
  vi.advanceTimersByTime(60_000)
  expect(OutputCtl.prototype.notice).toHaveBeenCalledTimes(2)
  expect(vi.getTimerCount()).toBe(0)
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.notice).mock.calls)).not.toMatch(
    /BCDF|fake-device|combined-key|never-print/,
  )
})

test('device login accepts API2 unrestricted keys with a null signature algorithm', async () => {
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, {
      ...authorized,
      signature_algo: null,
    })
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  const credentials = resolveCliConfig('login').credentials
  expect(credentials?.signatureAlgorithm).toBeUndefined()
  if (credentials === undefined) throw new Error('Expected saved unrestricted credentials')
  const signed = new Transloadit(credentials).calcSignature({ steps: {} })
  expect(signed.signature).toBe(signParamsSync(signed.params, authorized.auth_secret, 'sha384'))
  expect(await readFile('credentials', 'utf8')).not.toContain('SIGNATURE_ALGORITHM')
})

test('an opener error warns without emitting a false browser result on JSON stdout', async () => {
  createDevice().post('/cli/device_authorizations/token').reply(200, authorized)
  const warn = vi.spyOn(OutputCtl.prototype, 'warn').mockImplementation(() => {})
  // @ts-expect-error The fake models promise/unref, not unrelated Execa subprocess fields.
  vi.mocked(execa).mockImplementationOnce(() =>
    Object.assign(Promise.reject(new Error('Local opener exited')), { unref: vi.fn() }),
  )
  await login(['--json'])
  expect(process.exitCode).toBeUndefined()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('The browser opener reported an error'))
  expect(OutputCtl.prototype.print).not.toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ browserOpened: false }),
  )
})

test('login does not await or kill a successfully launched long-lived browser', async () => {
  const api = createDevice().post('/cli/device_authorizations/token').reply(200, authorized)
  let finishBrowser: (() => void) | undefined
  const browser = Object.assign(
    new Promise<void>((resolve) => {
      finishBrowser = resolve
    }),
    { unref: vi.fn() },
  )
  // @ts-expect-error The fake models promise/unref, not unrelated Execa process fields.
  vi.mocked(execa).mockImplementationOnce(() => browser)
  const pending = login()
  try {
    await expect.poll(() => api.isDone(), { timeout: 500 }).toBe(true)
  } finally {
    finishBrowser?.()
    await pending
  }
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(browser.unref).toHaveBeenCalledOnce()
  expect(execa).toHaveBeenCalledWith(expect.any(String), [created.verification_url], {
    stdio: 'ignore',
    detached: true,
    cleanup: false,
  })
})

test('status reports saved login identity and logout revokes only that key before removing the file', async () => {
  const authKeyId = '12345678901234567890123456789012'
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, {
      ...authorized,
      auth_key_id: authKeyId,
      description: 'Transloadit CLI on canary',
    })
    .delete('/auth_keys/self', (body: string) => {
      const params = /name="params"\r\n\r\n([^\r\n]+)/.exec(body)?.[1]
      expect(params).toBeDefined()
      if (params === undefined) return false
      expect(JSON.parse(params).auth.key).toBe(authorized.auth_key)
      return true
    })
    .reply(200, { ok: 'AUTH_KEY_DELETED' })
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  await main(['auth', 'status'])
  expect(process.exitCode).toBeUndefined()
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Transloadit CLI on canary'),
    expect.objectContaining({ workspace: 'my-app' }),
  )
  vi.stubEnv('TRANSLOADIT_KEY', 'unrelated-shell-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'unrelated-shell-secret')
  vi.stubEnv('TRANSLOADIT_ENDPOINT', 'http://untrusted.invalid')
  await main(['auth', 'logout'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  await expect(stat('credentials')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('a refused logout keeps the credential file and never claims remote revocation', async () => {
  const authKeyId = '12345678901234567890123456789012'
  createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, { ...authorized, auth_key_id: authKeyId })
  await login(['--no-browser'])
  const before = await readFile('credentials', 'utf8')
  const api = nock(origin)
    .delete('/auth_keys/self')
    .reply(403, { error: 'AUTH_KEY_NOT_DELETED', message: 'unsafe never-print-this-secret' })
  await main(['auth', 'logout'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readFile('credentials', 'utf8')).toBe(before)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('not revoked'))
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'never-print-this-secret',
  )
})

test('browser logout does not require key-id metadata', async () => {
  createDevice().post('/cli/device_authorizations/token').reply(200, authorized)
  await login(['--no-browser'])
  const api = nock(origin).delete('/auth_keys/self').reply(200, { ok: 'AUTH_KEY_DELETED' })
  await main(['auth', 'logout'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  await expect(stat('credentials')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('logout rejects --no-revoke without silently revoking a browser-login key', async () => {
  createDevice().post('/cli/device_authorizations/token').reply(200, authorized)
  await login(['--no-browser'])
  const before = await readFile('credentials', 'utf8')
  const api = nock(origin).delete('/auth_keys/self').reply(200, { ok: 'AUTH_KEY_DELETED' })
  await main(['auth', 'logout', '--no-revoke'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(false)
  expect(await readFile('credentials', 'utf8')).toBe(before)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('--no-revoke'))
})

test('login preflights Storage with the issued key and algorithm, without publishing anything', async () => {
  vi.mocked(Transloadit.prototype.listPublicStoragePrefixes).mockRestore()
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
    .get('/storage/public_prefixes')
    .query((query) => {
      if (typeof query.params !== 'string') return false
      expect(JSON.parse(query.params).auth.key).toBe(authorized.auth_key)
      expect(query.signature).toBe(signParamsSync(query.params, authorized.auth_secret, 'sha256'))
      return true
    })
    .reply(200, { ok: 'STORAGE_PUBLIC_PREFIXES_LISTED', public_prefixes: [] })
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Storage policy access verified'),
    expect.objectContaining({ storagePolicyAccess: true }),
  )
})

test.each([
  403, 503,
])('a denied or unavailable Storage preflight (HTTP %s) saves the login but prints a Console link', async (status) => {
  vi.mocked(Transloadit.prototype.listPublicStoragePrefixes).mockRestore()
  const api = createDevice()
    .post('/cli/device_authorizations/token')
    .reply(200, authorized)
    .get('/storage/public_prefixes')
    .query(true)
    .reply(status, {
      error: 'DAM_STORAGE_UNAVAILABLE',
      message: 'unsafe upstream never-print-this-secret',
    })
  await login(['--no-browser'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect((await stat('credentials')).mode & 0o777).toBe(0o600)
  expect(OutputCtl.prototype.warn).toHaveBeenCalledWith(
    expect.stringContaining('https://transloadit.com/c/my-app/'),
  )
  const output = JSON.stringify([
    ...vi.mocked(OutputCtl.prototype.warn).mock.calls,
    ...vi.mocked(OutputCtl.prototype.print).mock.calls,
  ])
  expect(output).not.toMatch(
    /unsafe upstream|never-print-this-secret|Storage policy access verified/,
  )
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ storagePolicyAccess: false }),
  )
})

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
