import { createHmac } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { getSignedSmartCdnUrl } from '@transloadit/utils/node'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const calls = vi.hoisted(() => vi.fn())
vi.mock('execa', () => ({ execa: () => calls }))

const originalCwd = process.cwd()
const originalArgv = process.argv
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'upload-once-example-'))
  process.chdir(directory)
  process.argv = ['node', 'demo.ts']
  vi.resetModules()
  calls.mockReset()
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () => new Response('fixture image', { headers: { 'content-type': 'image/webp' } }),
  )
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.argv = originalArgv
  process.exitCode = undefined
  vi.restoreAllMocks()
  await rm(directory, { recursive: true, force: true })
})

const receipt = {
  workspace: 'example',
  asset_id: 'A'.repeat(22),
  version_id: `${'B'.repeat(21)}A`,
}

function mockCommands(loggedIn = true): void {
  calls.mockImplementation((_node: string, args: string[], options?: { input?: string }) => {
    const command = args.slice(1, 3).join(' ')
    if (command === 'auth status')
      return { failed: false, stdout: JSON.stringify({ configured: loggedIn }) }
    if (command === 'auth login') return { failed: false, stdout: '' }
    if (command === 'storage publications') return { failed: false, stdout: '{}' }
    if (command === 'storage store') return { failed: false, stdout: JSON.stringify(receipt) }
    if (command === 'auth smart-cdn') {
      const params = JSON.parse(options?.input ?? '')
      return {
        failed: false,
        stdout: getSignedSmartCdnUrl({
          workspace: params.workspace,
          template: params.template,
          input: params.input,
          expiresAt: params.expire_at_ms,
          urlParams: params.url_params,
          authKey: 'example-key',
          authSecret: 'do-not-print-secret',
        }),
      }
    }
    throw new Error(`Unexpected command ${command}`)
  })
}

test.each([
  true,
  false,
])('the actual example reuses CLI auth/store/signing with saved login=%s', async (loggedIn) => {
  mockCommands(loggedIn)
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBeUndefined()
  const commands = calls.mock.calls.map(([, args]) => args.slice(1, 3).join(' '))
  expect(commands).toEqual([
    'auth status',
    ...(loggedIn ? [] : ['auth login']),
    'storage publications',
    'storage store',
    'auth smart-cdn',
    'auth smart-cdn',
    'auth smart-cdn',
  ])
  expect(calls.mock.calls[0][1].slice(1)).toEqual(['auth', 'status', '--effective', '--json'])
  if (!loggedIn) {
    expect(calls.mock.calls.find(([, args]) => args[2] === 'login')?.[2]).toMatchObject({
      stdio: 'inherit',
      timeout: 0,
    })
  }
  expect(
    calls.mock.calls.find(([, args]) => args[1] === 'storage' && args[2] === 'store')?.[1],
  ).toEqual([
    expect.any(String),
    'storage',
    'store',
    '--hashed',
    '--json',
    '--',
    './photo.jpg',
    'upload-once/',
  ])
  const html = await readFile('gallery.html', 'utf8')
  expect(html).toContain('One original, three variants')
  expect(html).not.toContain('do-not-print-secret')
  expect((await stat('gallery.html')).mode & 0o777).toBe(0o600)
  const urls = [...html.matchAll(/src="([^"]+)"/g)].map(
    (match) => new URL(match[1].replaceAll('&amp;', '&')),
  )
  expect(urls).toHaveLength(3)
  expect(fetch).toHaveBeenCalledExactlyOnceWith(urls[0].href, {
    signal: expect.any(AbortSignal),
    redirect: 'error',
  })
  expect(
    urls.map((url) => [
      url.searchParams.get('w'),
      url.searchParams.get('h'),
      url.searchParams.get('f'),
    ]),
  ).toEqual([
    ['640', '480', 'webp'],
    ['1280', '960', 'avif'],
    ['240', '240', 'jpg'],
  ])
  for (const url of urls) {
    expect(url.searchParams.get('v')).toBe(receipt.version_id)
    expect(url.pathname).toContain(receipt.asset_id)
    const signature = url.searchParams.get('sig')
    url.searchParams.delete('sig')
    expect(signature).toBe(
      `sha256:${createHmac('sha256', 'do-not-print-secret').update(`example${url.pathname}?${url.searchParams}`).digest('hex')}`,
    )
  }
})

test('does not upload after an access failure or print a credential-bearing subprocess error', async () => {
  calls.mockImplementation((_node: string, args: string[], options?: { stderr?: string }) => {
    if (args[1] === 'auth') return { failed: false, stdout: '{"configured":true}' }
    if (options?.stderr === 'inherit')
      console.error('https://example.test/?sig=do-not-print-secret')
    return { failed: true, stdout: 'do-not-print-secret', stderr: 'do-not-print-secret' }
  })
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBe(1)
  expect(calls.mock.calls.map(([, args]) => args.slice(1, 3).join(' '))).toEqual([
    'auth status',
    'storage publications',
  ])
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('do-not-print-secret')
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain('storage publications')
  await expect(readFile('gallery.html')).rejects.toMatchObject({ code: 'ENOENT' })
})

test.each([
  {
    body: JSON.stringify({
      error: 'GET_ACCOUNT_UNKNOWN_AUTH_KEY',
      reason: 'https://example.test/?sig=do-not-print-secret',
    }),
    detail: 'GET_ACCOUNT_UNKNOWN_AUTH_KEY',
  },
  { body: '{"error":"do-not-print-secret","reason":"do-not-print-secret"}', detail: 'HTTP 400' },
  { body: '<html>do-not-print-secret</html>', detail: 'HTTP 400' },
])('stops on rejected delivery with safe feedback: $detail', async ({ body, detail }) => {
  mockCommands()
  vi.mocked(fetch).mockResolvedValue(new Response(body, { status: 400 }))
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBe(1)
  expect(fetch).toHaveBeenCalledOnce()
  const errors = JSON.stringify(vi.mocked(console.error).mock.calls)
  expect(errors).toContain(detail)
  expect(errors).toContain('Smart CDN')
  expect(errors).not.toContain('do-not-print-secret')
  expect(errors).not.toContain('https://example.test')
  expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain('Open gallery.html')
  await expect(readFile('gallery.html')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('explains how normal device login differs from a supplied upload-only key', async () => {
  mockCommands()
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ error: 'GET_ACCOUNT_UNKNOWN_AUTH_KEY' }, { status: 400 }),
  )
  await import('../../../examples/upload-once/demo.ts')
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('credential source'))
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('device login'))
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Smart-CDN-enabled'))
})

test('withholds a delivery timeout error containing a signed URL', async () => {
  mockCommands()
  const deadline = new AbortController()
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
  vi.mocked(fetch).mockRejectedValue(new Error('https://example.test/?sig=do-not-print-secret'))
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBe(1)
  expect(AbortSignal.timeout).toHaveBeenCalledExactlyOnceWith(30_000)
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('check your connection'))
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('do-not-print-secret')
})

test('rejects a successful HTTP response that is not an image', async () => {
  mockCommands()
  const response = new Response('do-not-print-secret', { headers: { 'content-type': 'text/html' } })
  if (response.body === null) throw new Error('Missing mock response body')
  const cancel = vi.spyOn(response.body, 'cancel')
  vi.mocked(fetch).mockResolvedValue(response)
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBe(1)
  expect(cancel).toHaveBeenCalledOnce()
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('expected an image'))
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('do-not-print-secret')
})

test('releases the successful probe body and shows recovery text on a later browser image error', async () => {
  mockCommands()
  const response = new Response('image bytes', { headers: { 'content-type': 'image/webp' } })
  if (response.body === null) throw new Error('Missing mock response body')
  const cancel = vi.spyOn(response.body, 'cancel')
  vi.mocked(fetch).mockResolvedValue(response)
  await import('../../../examples/upload-once/demo.ts')
  expect(process.exitCode).toBeUndefined()
  expect(cancel).toHaveBeenCalledOnce()
  const html = await readFile('gallery.html', 'utf8')
  expect(html).toContain('role="status" hidden')
  expect(html).toContain('This variant could not load')
  expect(html).toContain('npm run demo')
  const handler = html.match(/onerror="([^"]+)"/)?.[1]
  expect(handler).toBeDefined()
  const image = { hidden: false, nextElementSibling: { hidden: true } }
  runInNewContext(`(function () { ${handler} }).call(image)`, { image })
  expect(image.hidden).toBe(true)
  expect(image.nextElementSibling.hidden).toBe(false)
})
