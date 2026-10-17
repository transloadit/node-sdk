import { createHmac } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

test.each([
  true,
  false,
])('the actual example reuses CLI auth/store/signing with saved login=%s', async (loggedIn) => {
  const receipt = {
    workspace: 'example',
    asset_id: 'A'.repeat(22),
    version_id: `${'B'.repeat(21)}A`,
  }
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
