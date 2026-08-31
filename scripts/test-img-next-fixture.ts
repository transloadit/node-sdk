import { cp, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'

import { execa } from 'execa'

import { withProcess } from './withProcess.ts'

const fixtureSecret = 'fixture-secret-must-never-reach-the-browser'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        server.close()
        reject(new Error('Could not allocate a fixture port'))
        return
      }
      server.close((error) => {
        if (error) reject(error)
        else resolvePort(address.port)
      })
    })
  })
}

async function fetchWhenReady(url: string, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await fetch(url, { signal }).catch((error: unknown) => {
      if (signal?.aborted) throw error
      return undefined
    })
    if (response?.ok) return response
    if (response !== undefined) {
      const body = (await response.text()).slice(0, 1_000)
      throw new Error(`${url} returned HTTP ${response.status}: ${body}`)
    }
    await setTimeout(250, undefined, { signal })
  }
  throw new Error(`Next.js fixture did not become ready at ${url}`)
}

async function withFixtureServer(
  fixtureDir: string,
  verify: (baseUrl: string) => Promise<void>,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await getFreePort()
    const baseUrl = `http://127.0.0.1:${port}`
    const server = execa('npm', ['run', 'start', '--', '-H', '127.0.0.1', '-p', `${port}`], {
      cwd: fixtureDir,
      reject: false,
    })
    server.stdout?.pipe(process.stdout)
    server.stderr?.pipe(process.stderr)
    const shouldRetry = await withProcess(server, async () => {
      const abortController = new AbortController()
      try {
        const outcome = await Promise.race([
          fetchWhenReady(`${baseUrl}/public-image`, abortController.signal).then(() => undefined),
          server,
        ])
        if (outcome === undefined) {
          await verify(baseUrl)
          return false
        }
        if (!outcome.stderr.includes('EADDRINUSE')) {
          throw new Error(`Next.js fixture server exited before becoming ready: ${outcome.stderr}`)
        }
        return true
      } finally {
        abortController.abort()
      }
    })

    if (!shouldRetry) return
  }

  throw new Error('Next.js fixture could not reserve a port after five attempts')
}

async function assertTreeExcludes(directory: string, forbidden: string): Promise<void> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const contents = await readFile(resolve(entry.parentPath, entry.name))
    assert(
      !contents.includes(forbidden),
      `${forbidden} leaked into ${entry.parentPath}/${entry.name}`,
    )
  }
}

async function main(): Promise<void> {
  const repoRoot = resolve(import.meta.dirname, '..')
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'transloadit-img-next-'))
  const fixtureDir = resolve(temporaryRoot, 'fixture')
  const packDir = resolve(temporaryRoot, 'pack')

  try {
    // Keep the entire external execution graph reviewable and age-gated in the repository.
    await Promise.all([
      cp(resolve(import.meta.dirname, 'fixtures/img-next'), fixtureDir, { recursive: true }),
      mkdir(packDir),
    ])
    await execa(
      'corepack',
      [
        'yarn',
        'workspace',
        '@transloadit/img',
        'pack',
        '--out',
        resolve(packDir, 'transloadit-img-0.0.0.tgz'),
      ],
      { cwd: repoRoot, stdio: 'inherit' },
    )
    await execa(
      'npm',
      ['pack', resolve(repoRoot, 'packages/utils'), '--pack-destination', packDir],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      },
    )
    const tarballs = (await readdir(packDir)).filter((name) => name.endsWith('.tgz'))
    assert(tarballs.length === 2, `Expected two package tarballs, found ${tarballs.length}`)
    const imageTarball = tarballs.find((name) => name.startsWith('transloadit-img-'))
    const utilsTarball = tarballs.find((name) => name.startsWith('transloadit-utils-'))
    assert(imageTarball !== undefined, 'Expected an @transloadit/img package tarball')
    assert(utilsTarball !== undefined, 'Expected an @transloadit/utils package tarball')
    await execa('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: fixtureDir,
      stdio: 'inherit',
    })
    await execa(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--no-save',
        '--offline',
        '--package-lock=false',
        resolve(packDir, utilsTarball),
        resolve(packDir, imageTarball),
      ],
      { cwd: fixtureDir, stdio: 'inherit' },
    )
    await execa('npm', ['run', 'build'], { cwd: fixtureDir, stdio: 'inherit' })

    const appOutput = resolve(fixtureDir, '.next/server/app')
    const outputNames = await readdir(appOutput, { recursive: true })
    assert(outputNames.includes('public-image.html'), 'Expected the public URL route to prerender')
    assert(
      outputNames.includes('storage-image.html'),
      'Expected a safe partial-prerender Storage shell',
    )
    const storageShell = await readFile(resolve(appOutput, 'storage-image.html'), 'utf8')
    assert(storageShell.includes('Loading preview'), 'Storage shell fallback is absent')
    assert(
      !storageShell.includes('builtin%2Fstorage-preview%400.0.1'),
      'A signed Storage URL leaked into the prerendered shell',
    )
    await assertTreeExcludes(resolve(fixtureDir, '.next/static'), fixtureSecret)
    await assertTreeExcludes(appOutput, fixtureSecret)

    await withFixtureServer(fixtureDir, async (baseUrl) => {
      const publicResponse = await fetchWhenReady(`${baseUrl}/public-image`)
      const publicLinkHeader = publicResponse.headers.get('link') ?? ''
      const publicHtml = await publicResponse.text()
      const storageHtml = await (await fetchWhenReady(`${baseUrl}/storage-image`)).text()
      assert(publicHtml.includes('builtin%2Fserve-image%400.0.1'), 'Public Built-in is absent')
      assert(publicHtml.includes('/fallback.jpg'), 'Public fallback is absent')
      const imagePreloads = (publicHtml.match(/<link\b[^>]*>/g) ?? []).filter(
        (tag) => tag.includes('rel="preload"') && tag.includes('as="image"'),
      )
      assert(
        imagePreloads.length === 1,
        `Expected one responsive image preload; HTML=${JSON.stringify(imagePreloads)} Link=${publicLinkHeader}`,
      )
      const headEnd = publicHtml.indexOf('</head>')
      assert(
        headEnd > 0 && imagePreloads.every((tag) => publicHtml.indexOf(tag) < headEnd),
        'Responsive image preloads were not hoisted into the document head',
      )
      assert(imagePreloads[0]?.includes('imageSrcSet='), 'Responsive preload srcset is absent')
      assert(
        storageHtml.includes('builtin%2Fstorage-preview%400.0.1'),
        'Storage Built-in is absent',
      )
      assert(storageHtml.includes('r=pad'), 'Storage preview does not preserve exact dimensions')
      assert(storageHtml.includes('q=45'), 'Storage preview does not apply format-specific quality')
      assert(!publicHtml.includes(fixtureSecret), 'Secret leaked into public URL output')
      assert(!storageHtml.includes(fixtureSecret), 'Secret leaked into Storage output')
    })
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
