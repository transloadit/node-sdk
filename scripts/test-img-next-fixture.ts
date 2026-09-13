import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'

import { execa } from 'execa'

import { withProcess } from './withProcess.ts'

const fixtureSecret = 'fixture-secret-must-never-reach-the-browser'
const renderingEnvironment = {
  TRANSLOADIT_KEY: 'fixture-auth-key',
  TRANSLOADIT_SECRET: fixtureSecret,
  TRANSLOADIT_SMART_CDN_KEY: undefined,
  TRANSLOADIT_SMART_CDN_SECRET: undefined,
  TRANSLOADIT_WORKSPACE: 'fixture',
}
const benchmarkCounts: readonly number[] = [1, 20, 100]

interface ImageBenchmarkResult {
  brotliBytes: number
  count: number
  delivery: 'direct' | 'redirect'
  gzipBytes: number
  htmlBytes: number
  htmlMs: number
  routeMs: number
  routeRequests: number
}

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
  cdnOrigin: string,
  cacheComponents: string,
  verify: (baseUrl: string) => Promise<void>,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await getFreePort()
    const baseUrl = `http://127.0.0.1:${port}`
    // Start Next directly so cleanup targets the server process instead of an npm wrapper. On
    // Linux, killing the wrapper can leave Next holding Execa's output pipes open indefinitely.
    const server = execa(
      process.execPath,
      [
        resolve(fixtureDir, 'node_modules/next/dist/bin/next'),
        'start',
        '-H',
        '127.0.0.1',
        '-p',
        `${port}`,
      ],
      {
        cwd: fixtureDir,
        env: {
          ...renderingEnvironment,
          IMG_FIXTURE_CDN_ORIGIN: cdnOrigin,
          IMG_FIXTURE_CACHE_COMPONENTS: cacheComponents,
        },
        reject: false,
      },
    )
    server.stdout?.pipe(process.stdout)
    server.stderr?.pipe(process.stderr)
    const shouldRetry = await withProcess(server, async () => {
      const abortController = new AbortController()
      try {
        const outcome = await Promise.race([
          fetchWhenReady(`${baseUrl}/fixture/storage-image`, abortController.signal).then(
            () => undefined,
          ),
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

function decodeHtmlAttribute(value: string): string {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'")
}

function getFirstPictureCandidates(html: string): string[] {
  const pictures = html.match(/<picture\b[\s\S]*?<\/picture>/gi) ?? []
  const candidates: string[] = []
  for (const picture of pictures) {
    const sourceSet = /<source\b[^>]*\bsrcset="([^"]+)"/i.exec(picture)?.[1]
    // Streamed HTML also contains source-free Suspense placeholders; count only resolved images.
    if (sourceSet === undefined) continue
    const decoded = decodeHtmlAttribute(sourceSet)
    const separator = decoded.indexOf(' ')
    assert(separator > 0, 'Expected every benchmark candidate to have a width descriptor')
    candidates.push(decoded.slice(0, separator))
  }
  return candidates
}

async function runImageBenchmark(
  baseUrl: string,
  cdnOrigin: string,
  count: number,
  delivery: 'direct' | 'redirect',
): Promise<ImageBenchmarkResult> {
  const htmlStartedAt = performance.now()
  const response = await fetchWhenReady(`${baseUrl}/fixture/benchmark/${delivery}/${count}`)
  const html = await response.text()
  const htmlMs = performance.now() - htmlStartedAt
  const candidates = getFirstPictureCandidates(html)
  assert(candidates.length === count, `Expected ${count} ${delivery} benchmark pictures`)

  let routeMs = 0
  if (delivery === 'redirect') {
    const routeStartedAt = performance.now()
    const redirects = await Promise.all(
      candidates.map((candidate) =>
        fetch(new URL(candidate, baseUrl), {
          headers: { Cookie: 'fixture-session=fixture' },
          redirect: 'manual',
        }),
      ),
    )
    routeMs = performance.now() - routeStartedAt
    for (const redirect of redirects) {
      assert(redirect.status === 307, 'Expected every authorized image route to redirect')
      assert(
        redirect.headers.get('location')?.startsWith(`${cdnOrigin}/`) === true,
        'Expected every image redirect to target Smart CDN',
      )
      assert((await redirect.text()) === '', 'An image route must not proxy response bytes')
    }
  } else {
    assert(
      candidates.every((candidate) => candidate.startsWith(`${cdnOrigin}/`)),
      'Expected direct benchmark images to bypass the application route',
    )
  }

  return {
    brotliBytes: brotliCompressSync(html).byteLength,
    count,
    delivery,
    gzipBytes: gzipSync(html).byteLength,
    htmlBytes: Buffer.byteLength(html),
    htmlMs: Math.round(htmlMs * 10) / 10,
    routeMs: Math.round(routeMs * 10) / 10,
    routeRequests: delivery === 'redirect' ? count : 0,
  }
}

async function main(): Promise<void> {
  const repoRoot = resolve(import.meta.dirname, '..')
  const seed = await readFile(resolve(import.meta.dirname, 'fixtures/img-next/seed.ts'), 'utf8')
  const dogfoodPath = resolve(repoRoot, 'docs/img-dogfood.md')
  const readme = await readFile(dogfoodPath, 'utf8')
  assert(
    readme.includes(`\`\`\`ts\n${seed}\`\`\``),
    'The documented seed recipe differs from the tested fixture',
  )
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'transloadit-img-next-'))
  const fixtureDir = resolve(temporaryRoot, 'fixture')
  const packDir = resolve(temporaryRoot, 'pack')
  const cdnOrigin = `http://localhost:${await getFreePort()}`

  try {
    // Keep the entire external execution graph reviewable and age-gated in the repository.
    await Promise.all([
      cp(resolve(import.meta.dirname, 'fixtures/img-next'), fixtureDir, { recursive: true }),
      mkdir(packDir),
    ])
    const tarballs: string[] = []
    // Package builds share dependencies, so pack sequentially to avoid racing their dist cleanup.
    for (const name of ['img', 'node', 'types', 'utils']) {
      const tarball = resolve(packDir, `transloadit-${name}.tgz`)
      await execa(
        'corepack',
        ['yarn', 'workspace', `@transloadit/${name}`, 'pack', '--out', tarball],
        {
          cwd: repoRoot,
          stdio: 'inherit',
        },
      )
      tarballs.push(tarball)
    }
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
        '--prefer-offline',
        '--package-lock=false',
        ...tarballs,
      ],
      { cwd: fixtureDir, stdio: 'inherit' },
    )
    await execa(process.execPath, ['--test', 'seed.test.ts'], {
      cwd: fixtureDir,
      env: { IMG_DOGFOOD_DOC: dogfoodPath },
      stdio: 'inherit',
    })
    // Build the actual generated public app in isolation: no private routes that could mask a
    // public-only credential dependency, no custom compiler options, and no secrets in its env.
    const publicDir = resolve(temporaryRoot, 'public-only')
    await cp(resolve(fixtureDir, 'app/cli-image'), publicDir, { recursive: true })
    for (const file of [
      'package.json',
      'next.config.ts',
      'app/layout.tsx',
      'app/HydrationProbe.tsx',
    ]) {
      await cp(resolve(fixtureDir, file), resolve(publicDir, file))
    }
    await execa('npx', ['--no-install', 'tsc', '--project', 'tsconfig.tooling.json'], {
      cwd: fixtureDir,
      stdio: 'inherit',
    })
    const cliHelp = await execa(
      'npx',
      ['--no-install', 'transloadit', 'storage', 'store', '--help'],
      {
        cwd: fixtureDir,
      },
    )
    assert(cliHelp.stdout.includes('--receipts'), 'The packed CLI must expose storage store')
    const playwright = resolve(fixtureDir, 'node_modules/@playwright/test/cli.js')
    await execa(
      process.execPath,
      [
        playwright,
        'install',
        ...(process.env.CI && process.platform === 'linux' ? ['--with-deps'] : []),
        'chromium',
        'webkit',
      ],
      { cwd: fixtureDir, stdio: 'inherit' },
    )
    for (const cacheComponents of ['enabled', 'omitted']) {
      console.log(`Secretless public-only build: cacheComponents ${cacheComponents}`)
      // Reuse the installed tree without doubling disk usage or requiring a nonstandard
      // Turbopack root for symlinks. Builds are sequential; restore it before the main fixture.
      await rename(resolve(fixtureDir, 'node_modules'), resolve(publicDir, 'node_modules'))
      try {
        await execa(
          process.execPath,
          [resolve(publicDir, 'node_modules/next/dist/bin/next'), 'build'],
          {
            cwd: publicDir,
            env: {
              TRANSLOADIT_WORKSPACE: 'fixture',
              TRANSLOADIT_KEY: undefined,
              TRANSLOADIT_SECRET: undefined,
              TRANSLOADIT_SMART_CDN_KEY: undefined,
              TRANSLOADIT_SMART_CDN_SECRET: undefined,
              IMG_FIXTURE_CDN_ORIGIN: cdnOrigin,
              IMG_FIXTURE_CACHE_COMPONENTS: cacheComponents,
            },
            stdio: 'inherit',
          },
        )
      } finally {
        await rename(resolve(publicDir, 'node_modules'), resolve(fixtureDir, 'node_modules'))
      }
      const generatedPublicHtml = await readFile(
        resolve(publicDir, '.next/server/app/storage-image-example.html'),
        'utf8',
      )
      assert(
        generatedPublicHtml.includes('builtin%2Fpublic-preview%400.0.1'),
        'The secretless app must prerender actual public URLs',
      )
      assert(
        !/auth_key=|sig=|exp=/.test(generatedPublicHtml),
        'The secretless public app must not sign URLs',
      )
      console.log(`Production fixture: cacheComponents ${cacheComponents}`)
      await execa(
        process.execPath,
        [resolve(fixtureDir, 'node_modules/next/dist/bin/next'), 'build'],
        {
          cwd: fixtureDir,
          env: {
            ...renderingEnvironment,
            IMG_FIXTURE_CDN_ORIGIN: cdnOrigin,
            IMG_FIXTURE_CACHE_COMPONENTS: cacheComponents,
          },
          stdio: 'inherit',
        },
      )

      const appOutput = resolve(fixtureDir, '.next/server/app')
      const outputNames = await readdir(appOutput, { recursive: true })
      assert(
        outputNames.includes('public-image.html'),
        'Public direct images must prerender with or without Cache Components',
      )
      const publicHtml = await readFile(resolve(appOutput, 'public-image.html'), 'utf8')
      assert(
        publicHtml.includes('builtin%2Fpublic-preview%400.0.1'),
        'Public HTML must already contain unsigned direct URLs',
      )
      assert(
        !/auth_key=|sig=|exp=/.test(publicHtml),
        'Public HTML must not contain signing credentials or expiry',
      )
      assert(
        publicHtml.includes('v=d41d8cd98f00b204'),
        'Public HTML must use a receipt-derived version',
      )
      assert(
        !publicHtml.includes('visibility:hidden'),
        'Public direct images must not emit a signing shell',
      )
      assert(
        publicHtml.includes('max-width:960px'),
        'Public hero must be constrained without a CSS reset',
      )
      assert(
        outputNames.includes('storage-image.html') === (cacheComponents === 'enabled'),
        'Only Cache Components should emit a partial-prerender Storage shell',
      )
      assert(
        outputNames.includes('storage-redirect.html'),
        'Expected redirect-delivery markup to prerender',
      )
      assert(
        outputNames.includes('delivery.html'),
        'Public/private redirect markup must stay static',
      )
      if (cacheComponents === 'enabled') {
        const storageShell = await readFile(resolve(appOutput, 'storage-image.html'), 'utf8')
        assert(
          /<picture><img\b/.test(storageShell),
          'Storage placeholder does not retain picture-based CSS selectors',
        )
        assert(
          storageShell.includes('visibility:hidden'),
          'Storage shell does not reserve image layout',
        )
        assert(
          storageShell.includes('width="2400"') && storageShell.includes('height="1600"'),
          'Hero source dimensions are absent',
        )
        assert(
          storageShell.includes('height:auto;max-width:960px;width:100%'),
          'Hero responsive CSS is absent',
        )
        assert(storageShell.includes('height:48px;width:48px'), 'Avatar CSS box is absent')
        assert(
          !storageShell.includes('builtin%2Fstorage-preview%400.0.2'),
          'A signed Storage URL leaked into the prerendered shell',
        )
      }
      await assertTreeExcludes(resolve(fixtureDir, '.next/static'), fixtureSecret)
      await assertTreeExcludes(appOutput, fixtureSecret)

      await withFixtureServer(fixtureDir, cdnOrigin, cacheComponents, async (baseUrl) => {
        const storageHtml = await (await fetchWhenReady(`${baseUrl}/fixture/storage-image`)).text()
        const redirectResponse = await fetchWhenReady(`${baseUrl}/fixture/storage-redirect`)
        const redirectLinkHeader = redirectResponse.headers.get('link') ?? ''
        const redirectHtml = await redirectResponse.text()
        const imagePreloads = (redirectHtml.match(/<link\b[^>]*>/g) ?? []).filter(
          (tag) => tag.includes('rel="preload"') && tag.includes('as="image"'),
        )
        assert(
          imagePreloads.length === 1,
          `Expected one responsive image preload; HTML=${JSON.stringify(imagePreloads)} Link=${redirectLinkHeader}`,
        )
        const headEnd = redirectHtml.indexOf('</head>')
        assert(
          headEnd > 0 && imagePreloads.every((tag) => redirectHtml.indexOf(tag) < headEnd),
          'Responsive image preloads were not hoisted into the document head',
        )
        assert(imagePreloads[0]?.includes('imageSrcSet='), 'Responsive preload srcset is absent')
        assert(
          storageHtml.includes('builtin%2Fstorage-preview%400.0.2'),
          'Storage Built-in is absent',
        )
        assert(storageHtml.includes('r=pad'), 'Storage preview does not preserve exact dimensions')
        assert(
          storageHtml.includes('q=45'),
          'Storage preview does not apply format-specific quality',
        )
        assert(
          redirectHtml.includes('/fixture/api/private-images?'),
          'Authorized Storage route is absent',
        )
        assert(
          !redirectHtml.includes('builtin%2Fstorage-preview%400.0.2'),
          'Redirect markup contains a direct signed Storage URL',
        )
        assert(!storageHtml.includes(fixtureSecret), 'Secret leaked into Storage output')
        assert(!redirectHtml.includes(fixtureSecret), 'Secret leaked into redirect output')
        assert(
          storageHtml.includes(' 48w') && storageHtml.includes(' 96w'),
          'Avatar candidates are absent',
        )
        assert(storageHtml.includes('sizes="48px"'), 'Avatar sizes are absent')

        const routeCandidate = getFirstPictureCandidates(redirectHtml)[0]
        assert(routeCandidate !== undefined, 'Expected a redirect route candidate')
        const routeUrl = new URL(routeCandidate, baseUrl)
        const beforeAuthorization = Date.now()
        const allowed = await fetch(routeUrl, {
          headers: { Cookie: 'fixture-session=fixture' },
          redirect: 'manual',
        })
        assert(allowed.status === 307, 'Authorized Storage route did not redirect')
        assert((await allowed.text()) === '', 'Authorized Storage route must not proxy image bytes')
        const location = allowed.headers.get('location')
        assert(location !== null, 'Authorized Storage route has no target')
        const expiresAt = Number(new URL(location).searchParams.get('exp'))
        assert(
          expiresAt >= beforeAuthorization + 270_000 && expiresAt <= Date.now() + 300_000,
          'Redirect fixture did not keep its maximum five-minute grant inside the 30-second rotation bucket',
        )
        assert(
          allowed.headers.get('location')?.startsWith(`${cdnOrigin}/`) === true,
          'Authorized Storage route did not target Smart CDN',
        )
        const allowedHead = await fetch(routeUrl, {
          headers: { Cookie: 'fixture-session=fixture' },
          method: 'HEAD',
          redirect: 'manual',
        })
        assert(allowedHead.status === 307, 'Authorized Storage route did not support HEAD')
        assert((await allowedHead.text()) === '', 'Authorized HEAD response contained a body')
        const denied = await fetch(routeUrl, { redirect: 'manual' })
        assert(denied.status === 404, 'Unauthorized Storage route did not conceal the object')
        const capability = routeUrl.searchParams.get('cap')
        assert(capability !== null, 'Authorized Storage route capability is absent')
        const replacement = capability.endsWith('A') ? 'B' : 'A'
        routeUrl.searchParams.set('cap', `${capability.slice(0, -1)}${replacement}`)
        const altered = await fetch(routeUrl, {
          headers: { Cookie: 'fixture-session=fixture' },
          redirect: 'manual',
        })
        assert(altered.status === 404, 'Storage route accepted an altered transform capability')

        const benchmarks: ImageBenchmarkResult[] = []
        for (const count of benchmarkCounts) {
          benchmarks.push(await runImageBenchmark(baseUrl, cdnOrigin, count, 'direct'))
          benchmarks.push(await runImageBenchmark(baseUrl, cdnOrigin, count, 'redirect'))
        }
        console.table(benchmarks)
        await execa(process.execPath, [playwright, 'test'], {
          cwd: fixtureDir,
          env: {
            IMG_FIXTURE_BASE_URL: baseUrl,
            IMG_FIXTURE_CDN_ORIGIN: cdnOrigin,
            IMG_FIXTURE_CACHE_COMPONENTS: cacheComponents,
            IMG_FIXTURE_OUTPUT_DIR: resolve(repoRoot, 'test-results/img-next', cacheComponents),
          },
          stdio: 'inherit',
        })
      })
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
