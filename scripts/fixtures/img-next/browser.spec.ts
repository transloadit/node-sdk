import type { Locator, Page, Request, Response, Route } from '@playwright/test'

import assert from 'node:assert/strict'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { setImmediate } from 'node:timers/promises'

import { test as base, expect } from '@playwright/test'
import sharp from 'sharp'

import { imageConfiguration } from './app/imageConfiguration.ts'
import { startFixtureCdn } from './browser-cdn.ts'
import { revokedAccessFile } from './browser-policy.ts'
import { fixtureStorageIdentity } from './storage-fixtures.ts'

declare global {
  interface Window {
    fixtureLcpMs: number | null
  }
}

interface ImageEvidence {
  bytes: number
  corner?: number[]
  contentType: string | undefined
  height: number | undefined
  url: string
  width: number | undefined
}

interface BrowserAudit {
  completedDownloads: Set<string>
  committedRefreshes: Set<Request>
  expectedFailures: Map<string, number>
  images: ImageEvidence[]
  loadNativeImage(url: string): Promise<{
    loaded: boolean
    status: number
    headers: Record<string, string>
    bodyLength: number | undefined
  }>
}

const cdnOrigin = process.env.IMG_FIXTURE_CDN_ORIGIN
assert(cdnOrigin, 'The packed fixture must provide its own CDN origin')
let cdn: Awaited<ReturnType<typeof startFixtureCdn>>

const test = base.extend<{ audit: BrowserAudit }>({
  audit: [
    async ({ page, context, browserName, javaScriptEnabled }, use, info) => {
      const expectedFailures = new Map<string, number>()
      const completedDownloads = new Set<string>()
      const images: ImageEvidence[] = []
      const errors: string[] = []
      const failedRequests: Request[] = []
      const committedRefreshes = new Set<Request>()
      const cancelledRefreshes: string[] = []
      const disabledScriptPreloads: string[] = []
      // The empty scaffold intentionally has no favicon; it is not an image delivery failure.
      expectedFailures.set(new URL('/favicon.ico', info.project.use.baseURL).href, 404)
      await rm(revokedAccessFile, { force: true })
      await context.addCookies([
        {
          name: 'fixture-session',
          value: 'fixture',
          domain: '127.0.0.1',
          path: '/',
          httpOnly: true,
          sameSite: 'Strict',
        },
      ])
      if (browserName === 'chromium') {
        // Fulfilled HTML has no network address-space classification. Explicitly grant access
        // to our loopback fixture even in the no-JavaScript format-fallback scenario.
        await context.grantPermissions(['local-network-access'], {
          origin: info.project.use.baseURL,
        })
      }
      async function observe(page: Page): Promise<void> {
        await page.addInitScript(() => {
          window.fixtureLcpMs = null
          if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) window.fixtureLcpMs = entry.startTime
            }).observe({ buffered: true, type: 'largest-contentful-paint' })
          }
        })
        await page.route('**/*', (route) => {
          const url = new URL(route.request().url())
          if (url.origin === cdnOrigin || url.origin === info.project.use.baseURL)
            return route.continue()
          errors.push(`Unexpected external request: ${url.origin}`)
          return route.abort('blockedbyclient')
        })
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('console', (message) => {
          if (message.type() !== 'error') return
          const status = expectedFailures.get(message.location().url)
          if (status !== undefined && message.text().includes(String(status))) return
          errors.push(message.text())
        })
        page.on('requestfailed', (request) => {
          failedRequests.push(request)
        })
        page.on('response', async (response) => {
          if (
            response.status() >= 400 &&
            expectedFailures.get(response.url()) !== response.status()
          ) {
            errors.push(`HTTP ${response.status()}: ${response.url()}`)
          }
          if (!response.ok() || response.request().resourceType() !== 'image') return
          const bytes = await response.body()
          const metadata = await sharp(bytes).metadata()
          const corner = ['documents/alpha.png', 'website/alpha.png'].some((path) =>
            new URL(response.url()).pathname.endsWith(`/${fixtureStorageIdentity(path).asset_id}`),
          )
            ? [
                ...(await sharp(bytes)
                  .extract({ left: 0, top: 0, width: 1, height: 1 })
                  .ensureAlpha()
                  .raw()
                  .toBuffer()),
              ]
            : undefined
          images.push({
            bytes: bytes.length,
            corner,
            contentType: response.headers()['content-type'],
            height: metadata.height,
            width: metadata.width,
            url: response.url(),
          })
        })
      }
      await observe(page)
      await use({
        completedDownloads,
        committedRefreshes,
        expectedFailures,
        images,
        async loadNativeImage(url) {
          const browser = context.browser()
          assert(browser)
          // An existing WebKit document may reuse its already-decoded image without HTTP.
          // A separate browsing session proves a new grant, without changing the original URL.
          const probeContext = await browser.newContext({
            storageState: { cookies: await context.cookies(), origins: [] },
          })
          try {
            if (browserName === 'chromium') {
              await probeContext.grantPermissions(['local-network-access'], {
                origin: info.project.use.baseURL,
              })
            }
            const probe = await probeContext.newPage()
            await observe(probe)
            await probe.route('**/fixture/native-probe', (route) =>
              route.fulfill({
                contentType: 'text/html',
                body: '<!doctype html><title>Native image probe</title>',
              }),
            )
            await probe.goto(new URL('/fixture/native-probe', page.url()).href)
            const sourceResponses: Response[] = []
            probe.on('response', (response) => {
              if (response.url() === url) sourceResponses.push(response)
            })
            const loaded = await probe.evaluate(async (src) => {
              const image = new Image()
              image.src = src
              try {
                await image.decode()
                return true
              } catch {
                return false
              }
            }, url)
            const sourceResponse = sourceResponses[0]
            assert(sourceResponse, 'The native probe must make an actual HTTP request')
            return {
              loaded,
              status: sourceResponse.status(),
              headers: sourceResponse.headers(),
              bodyLength:
                sourceResponse.status() >= 400 ? (await sourceResponse.body()).length : undefined,
            }
          } finally {
            try {
              for (const probe of probeContext.pages()) {
                await probe.removeAllListeners('response', { behavior: 'wait' })
              }
            } finally {
              await probeContext.close()
            }
          }
        },
      })
      // Stop accepting reads before draining: Promise.all on a growing array misses late responses.
      await page.removeAllListeners('response', { behavior: 'wait' })
      for (const request of failedRequests) {
        // Successful native downloads cancel document navigation in Chromium and WebKit.
        if (completedDownloads.has(request.url())) continue
        if (expectedFailures.has(request.url())) continue
        const url = new URL(request.url())
        // Chromium reports disabled script preloads as CSP failures. Only the deliberate
        // no-JS scenario's same-origin Next chunks are exempt, never image or network errors.
        if (
          javaScriptEnabled === false &&
          browserName === 'chromium' &&
          request.resourceType() === 'script' &&
          request.failure()?.errorText === 'csp' &&
          url.origin === new URL(info.project.use.baseURL ?? '').origin &&
          url.pathname.startsWith('/fixture/_next/static/chunks/') &&
          url.pathname.endsWith('.js')
        ) {
          disabledScriptPreloads.push(request.url())
          continue
        }
        // Chromium may cancel Flight after React commits. Only the exact successful refresh
        // whose UI, decoded image and preserved client state the test verified is exempt.
        if (
          committedRefreshes.has(request) &&
          request.failure()?.errorText === 'net::ERR_ABORTED'
        ) {
          cancelledRefreshes.push(request.url())
          continue
        }
        errors.push(`Failed request: ${request.url()}`)
      }
      await info.attach('native-image-responses', {
        body: JSON.stringify(
          {
            images,
            errors,
            cancelledRefreshes,
            disabledScriptPreloads,
            expectedFailures: [...expectedFailures],
          },
          null,
          2,
        ),
        contentType: 'application/json',
      })
      expect(errors).toEqual([])
      expect(images.every((image) => new URL(image.url).origin === cdnOrigin)).toBe(true)
      expect(images.every((image) => !image.url.includes(imageConfiguration.authSecret))).toBe(true)
      for (const image of images) {
        const url = new URL(image.url)
        expect(image.width).toBe(Number(url.searchParams.get('w')))
        expect(image.height).toBe(Number(url.searchParams.get('h')))
        const format = url.searchParams.get('f') ?? 'jpg'
        expect(image.contentType).toBe(`image/${format === 'jpg' ? 'jpeg' : format}`)
      }
      await rm(revokedAccessFile, { force: true })
    },
    { auto: true },
  ],
})

test.beforeAll(async () => {
  cdn = await startFixtureCdn(cdnOrigin)
})

test('response auditing waits for unfinished native body reads during listener cleanup', async ({
  page,
  audit,
}) => {
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  page.prependListener('response', (response: Response) => {
    if (!response.ok() || response.request().resourceType() !== 'image') return
    const body = response.body.bind(response)
    // The browser decodes normally; only the audit's own body read is held at the teardown edge.
    response.body = async () => {
      started.resolve()
      await release.promise
      return body()
    }
  })
  try {
    await page.goto('/fixture/cli-image/app/storage-image-example')
    await decode(page.getByRole('img', { name: 'hero', exact: true }))
    await started.promise
    let drained = false
    const drain = page.removeAllListeners('response', { behavior: 'wait' }).then(() => {
      drained = true
    })
    try {
      await setImmediate()
      expect(drained).toBe(false)
    } finally {
      release.resolve()
      await drain
    }
    expect(audit.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 960, height: 640 })]),
    )
  } finally {
    release.resolve()
  }
})

test('keeps transparent corners in native AVIF/WebP/PNG and composites JPEG onto its signed color', async ({
  page,
  audit,
}) => {
  await page.goto('/fixture/transparency')
  await expect(page.getByRole('heading', { name: 'Transparent previews' })).toBeVisible()
  await decode(page.getByRole('img', { name: 'AVIF logo', exact: true }))
  await decode(page.getByRole('img', { name: 'WebP logo', exact: true }))
  const png = page.getByRole('img', { name: 'PNG logo', exact: true })
  await decode(png)
  await expect.poll(() => audit.images.filter((image) => image.corner?.[3] === 0).length).toBe(3)
  expect(audit.images.map((image) => image.contentType)).toEqual(
    expect.arrayContaining(['image/avif', 'image/webp', 'image/png']),
  )
  const fallback = await png.getAttribute('src')
  assert(fallback)
  expect((await audit.loadNativeImage(new URL(fallback, page.url()).href)).loaded).toBe(true)
  const jpeg = audit.images.find((image) => image.contentType === 'image/jpeg')
  expect(jpeg?.corner?.[3]).toBe(255)
  expect(jpeg?.corner?.[0]).toBeCloseTo(34, -1)
  expect(jpeg?.corner?.[1]).toBeCloseTo(68, -1)
  expect(jpeg?.corner?.[2]).toBeCloseTo(102, -1)
})
test.afterAll(async () => {
  if (cdn === undefined) return
  await cdn.close()
  expect(cdn.errors).toEqual([])
  expect(cdn.requests.every((request) => request.cookie === undefined)).toBe(true)
})

async function decode(image: Locator): Promise<void> {
  // Scrolling schedules lazy selection asynchronously; decode() before that can reject an empty
  // request even though the real image loads successfully on the next intersection-observer tick.
  await expect
    .poll(() =>
      image.evaluate((element) => (element instanceof HTMLImageElement ? element.naturalWidth : 0)),
    )
    .toBeGreaterThan(0)
  await image.evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error('Expected native image')
    await element.decode()
  })
}

async function captureBeforeJavaScript(page: Page): Promise<Buffer> {
  // Deliberately held scripts keep document.fonts.ready pending even with system fonts. Capture
  // Chromium's compositor directly without releasing those scripts just to take a screenshot.
  const client = await page.context().newCDPSession(page)
  try {
    const screenshot = await client.send('Page.captureScreenshot')
    return Buffer.from(screenshot.data, 'base64')
  } finally {
    await client.detach()
  }
}

function expectSameBox(
  actual: Awaited<ReturnType<Locator['boundingBox']>>,
  expected: Awaited<ReturnType<Locator['boundingBox']>>,
): void {
  assert(actual && expected)
  expect(actual.x).toBe(expected.x)
  expect(actual.width).toBe(expected.width)
  expect(actual.height).toBe(expected.height)
  // Encoders round candidate heights to integer pixels (640×427 vs 2400×1600), so native
  // height:auto can move following content by a fraction of one CSS pixel after decoding.
  expect(actual.y).toBeCloseTo(expected.y, 0)
}

function redirectResponse(page: Page, capability: string): Promise<Response> {
  return page.waitForResponse(
    (response) => response.url() === capability && response.request().resourceType() === 'image',
  )
}

async function waitForExpiry(url: string): Promise<void> {
  const expiry = Number(new URL(url).searchParams.get('exp'))
  expect(expiry).toBeGreaterThan(0)
  expect(expiry - Date.now()).toBeLessThanOrEqual(11_000)
  await expect.poll(() => Date.now(), { timeout: 12_000, intervals: [100] }).toBeGreaterThan(expiry)
}

test('native image requests authorize with an HttpOnly session cookie, without Bearer headers', async ({
  baseURL,
  browserName,
  context,
  page,
}) => {
  const imageResponse = page.waitForResponse(
    (response) =>
      response.request().resourceType() === 'image' &&
      response.url().includes('/api/private-images'),
  )
  await page.goto('/fixture/storage-redirect')
  const response = await imageResponse
  expect(response.request().headers().authorization).toBeUndefined()
  // WebKit's protocol omits the Cookie header. The cookie-only authorizer and logged-out
  // rejection below verify its server-side effect in both engines.
  if (browserName === 'chromium')
    expect(await response.request().headerValue('cookie')).toBe('fixture-session=fixture')
  expect(response.status()).toBe(307)
  expect(response.headers()['cache-control']).toBe('private, no-store')
  await decode(page.getByRole('img', { name: 'Authorized Storage fixture' }))
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'fixture-session')?.httpOnly,
  ).toBe(true)
  expect(await page.evaluate(() => document.cookie)).toBe('')
  expect(await page.content()).not.toContain(imageConfiguration.authSecret)
  assert(baseURL)
  expect(new URL(cdnOrigin).hostname).not.toBe(new URL(baseURL).hostname)
})

test('GET and HEAD share private authorization while explicit public prefixes are cacheable', async ({
  context,
  page,
}) => {
  await page.goto('/fixture/delivery')
  await expect(page.getByRole('heading', { name: 'Static and private delivery' })).toBeVisible()
  const publicImage = page.getByRole('img', { name: 'Public website image' })
  const privateImage = page.getByRole('img', { name: 'Private account image' })
  await decode(publicImage)
  await decode(privateImage)
  const publicUrl = await publicImage.getAttribute('src')
  const privateUrl = await privateImage.getAttribute('src')
  assert(publicUrl)
  assert(privateUrl)
  const get = await context.request.get(privateUrl, { maxRedirects: 0 })
  const head = await context.request.head(privateUrl, { maxRedirects: 0 })
  expect(get.status()).toBe(307)
  expect(new URL(get.headers().location).searchParams.has('sig')).toBe(true)
  expect(head.status()).toBe(307)
  expect(head.headers().location).toBe(get.headers().location)
  expect(head.headers()['cache-control']).toBe('private, no-store')
  expect(await head.body()).toHaveLength(0)
  await context.clearCookies()
  const deniedGet = await context.request.get(privateUrl, { maxRedirects: 0 })
  const deniedHead = await context.request.head(privateUrl, { maxRedirects: 0 })
  expect(deniedGet.status()).toBe(404)
  expect(deniedHead.status()).toBe(404)
  expect(deniedHead.headers()['cache-control']).toBe('private, no-store')
  const publicGet = await context.request.get(publicUrl, { maxRedirects: 0 })
  const publicHead = await context.request.head(publicUrl, { maxRedirects: 0 })
  expect(publicGet.status()).toBe(200)
  expect(publicHead.status()).toBe(200)
  expect(new URL(publicUrl).searchParams.has('sig')).toBe(false)
  expect(new URL(publicUrl).searchParams.has('exp')).toBe(false)
  expect(new URL(publicUrl).searchParams.get('v')).toBe(
    fixtureStorageIdentity('documents/public/hero.jpg').version_id,
  )
  expect(publicGet.headers()['cache-control']).toMatch(
    /^public, max-age=31536000, s-maxage=31536000, immutable$/,
  )
  expect(publicHead.headers()['cache-control']).toBe(publicGet.headers()['cache-control'])
  expect(await publicHead.body()).toHaveLength(0)
})

for (const width of [390, 1200]) {
  test(`art direction downloads only the matching real crop at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    const offset = cdn.requests.length
    await page.goto('/fixture/art-direction')
    await expect(page.getByRole('heading', { name: 'Art-directed hero' })).toBeVisible()
    const image = page.getByRole('img', { name: 'Viewport crop' })
    await decode(image)
    const box = await image.boundingBox()
    assert(box)
    expect(box.width / box.height).toBeCloseTo(width === 390 ? 9 / 16 : 16 / 9, 2)
    const requests = cdn.requests.slice(offset)
    expect(requests).toHaveLength(1)
    assert(requests[0])
    const query = new URL(requests[0].url).searchParams
    expect(query.get('r')).toBe('fillcrop')
    expect(query.get('w')).toBe(width === 390 ? '640' : '960')
    expect(query.get('h')).toBe(width === 390 ? '1138' : '540')
    // Native dimensions are density-corrected for the selected CSS slot; the audit separately
    // decodes the downloaded bytes and checks their actual 640×1138 / 960×540 pixels.
    await expect(image).toHaveJSProperty('naturalWidth', width === 390 ? 390 : 960)
    await expect(image).toHaveJSProperty('naturalHeight', width === 390 ? 693 : 540)
    await info.attach('art-directed-hero', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
  })
}

for (const delivery of ['direct', 'redirect']) {
  for (const width of [1200, 390]) {
    test(`${delivery} hero and avatar decode and hydrate at ${width}px`, async ({
      browserName,
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 })
      const afterHero = page.getByText('After the hero', { exact: true })
      const afterAvatar = page.getByText('After the avatar', { exact: true })
      let decodedGeometry:
        | {
            hero: Awaited<ReturnType<Locator['boundingBox']>>
            avatar: Awaited<ReturnType<Locator['boundingBox']>>
          }
        | undefined
      // Required pre-JS proof covers native private redirects in both browsers. Chromium also
      // covers direct streaming; held bundles can stall React's reveal animation frame in WebKit.
      const holdScripts = delivery === 'redirect' || browserName === 'chromium'
      const scripts = Promise.withResolvers<void>()
      let scriptsWaiting = 0
      if (holdScripts) {
        await page.route('**/_next/**/*.js*', async (route) => {
          scriptsWaiting += 1
          await scripts.promise
          await route.continue()
        })
      }
      const started = performance.now()
      const requestOffset = cdn.requests.length
      const hero = page.getByRole('img', {
        name: delivery === 'direct' ? 'Storage hero' : 'Private hero',
        exact: true,
      })
      const avatar = page.getByRole('img', {
        name: delivery === 'direct' ? 'Storage avatar' : 'Private avatar',
        exact: true,
      })
      try {
        await page.goto(delivery === 'direct' ? '/fixture/storage-image' : '/fixture/browser', {
          waitUntil: 'commit',
        })
        await decode(hero)
        await decode(avatar)
        if (holdScripts) expect(scriptsWaiting).toBeGreaterThan(0)
        decodedGeometry = {
          hero: await afterHero.boundingBox(),
          avatar: await afterAvatar.boundingBox(),
        }
        expect((await hero.boundingBox())?.width).toBe(Math.min(960, width - 16))
        expect((await avatar.boundingBox())?.width).toBe(48)
        expect((await avatar.boundingBox())?.height).toBe(48)
        const currentSrc = await hero.evaluate((element) => {
          if (!(element instanceof HTMLImageElement)) throw new Error('Expected image')
          return element.currentSrc
        })
        const heroRequests = cdn.requests
          .slice(requestOffset)
          .filter((request) =>
            new URL(request.url).pathname.endsWith(
              `/${fixtureStorageIdentity('documents/hero.jpg').asset_id}`,
            ),
          )
        expect(heroRequests).toHaveLength(1)
        const heroRequest = heroRequests[0]
        assert(heroRequest)
        expect(new URL(heroRequest.url).searchParams.get('w')).toBe(width === 1200 ? '960' : '640')
        const heroSources = await hero.evaluate((element) =>
          [...(element.parentElement?.querySelectorAll('source') ?? [])].map(
            (source) => source.srcset,
          ),
        )
        expect(heroSources.every((source) => !source.includes('2400w'))).toBe(true)
        const avatarRequests = cdn.requests
          .slice(requestOffset)
          .filter((request) =>
            new URL(request.url).pathname.endsWith(
              `/${fixtureStorageIdentity('documents/avatar.jpg').asset_id}`,
            ),
          )
        expect(avatarRequests).toHaveLength(1)
        assert(avatarRequests[0])
        expect(new URL(avatarRequests[0].url).searchParams.get('r')).toBe('fillcrop')
        expect(new URL(avatarRequests[0].url).searchParams.get('w')).toBe('48')
        expect(new URL(avatarRequests[0].url).searchParams.get('h')).toBe('48')
        await expect(avatar).toHaveJSProperty('naturalWidth', 48)
        await expect(avatar).toHaveJSProperty('naturalHeight', 48)
        // WebKit has no CDP compositor API; its ordinary screenshot waits for the deliberately
        // held document load. Geometry is checked now in both engines; both capture after hydration.
        if (browserName === 'chromium')
          await info.attach('before-application-js', {
            body: await captureBeforeJavaScript(page),
            contentType: 'image/png',
          })
        await info.attach('load-diagnostics', {
          body: JSON.stringify({
            viewportWidth: width,
            imageReadyMs: performance.now() - started,
            currentSrc,
            browser: await page.evaluate(() => ({
              lcpMs: window.fixtureLcpMs,
              navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
            })),
          }),
          contentType: 'application/json',
        })
      } finally {
        scripts.resolve()
      }
      await page.getByRole('button', { name: 'Hydration count: 0' }).click()
      await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
      await info.attach('hydrated', { body: await page.screenshot(), contentType: 'image/png' })
      if (delivery === 'direct' && process.env.IMG_FIXTURE_CACHE_COMPONENTS === 'enabled') {
        assert(decodedGeometry)
        const hydrated = {
          hero: await afterHero.boundingBox(),
          avatar: await afterAvatar.boundingBox(),
        }
        const shell = await readFile('.next/server/app/storage-image.html', 'utf8')
        expect(shell).not.toContain('builtin%2Fstorage-preview')
        // Use this window only after the real page is finished: fake bootstrap responses must
        // not contaminate its module cache, and extra windows can disturb WebKit rendering.
        await page.route('**/fixture/storage-image', (route) =>
          route.fulfill({ contentType: 'text/html', body: shell }),
        )
        const emptyScript = (route: Route): Promise<void> =>
          route.fulfill({
            contentType: 'text/javascript',
            body: '',
            headers: { 'Cache-Control': 'no-store' },
          })
        await page.route('**/_next/**/*.js*', emptyScript)
        const requestsBeforeShell = cdn.requests.length
        await page.goto('/fixture/storage-image')
        const pending = {
          hero: await afterHero.boundingBox(),
          avatar: await afterAvatar.boundingBox(),
        }
        expectSameBox(decodedGeometry.hero, pending.hero)
        expectSameBox(decodedGeometry.avatar, pending.avatar)
        expectSameBox(hydrated.hero, pending.hero)
        expectSameBox(hydrated.avatar, pending.avatar)
        expect(cdn.requests).toHaveLength(requestsBeforeShell)
        await info.attach('prerendered-shell', {
          body: await page.screenshot(),
          contentType: 'image/png',
        })
      }
    })
  }
}

test.describe('JPEG fallback', () => {
  test.use({ javaScriptEnabled: false })
  test('native fallback decodes without modern sources and respects the candidate widths', async ({
    page,
  }) => {
    await page.route('**/fixture/browser', async (route) => {
      const response = await route.fetch()
      expect(response.ok()).toBe(true)
      // Simulate unsupported picture sources before parsing. This is format fallback, not
      // recovery from an HTTP failure; no hydration may restore the original source attributes.
      const html = (await response.text())
        .replaceAll(/<source\b/g, '<source media="not all"')
        .replaceAll(/<link\b(?=[^>]*rel="(?:preload|modulepreload)")[^>]*>/g, '')
      await route.fulfill({ response, body: html, headers: { ...response.headers(), link: '' } })
    })
    const requestOffset = cdn.requests.length
    await page.goto('/fixture/browser')
    await decode(page.getByRole('img', { name: 'Private hero', exact: true }))
    const avatar = page.getByRole('img', { name: 'Private avatar', exact: true })
    await decode(avatar)
    await decode(page.getByRole('img', { name: 'Late private preview' }))
    await expect(avatar).toHaveJSProperty('naturalWidth', 48)
    expect((await avatar.boundingBox())?.width).toBe(48)
    const images = cdn.requests.slice(requestOffset).map((request) => new URL(request.url))
    // Browsers disable native lazy loading when JavaScript is disabled.
    expect(images).toHaveLength(3)
    expect(images.every((url) => (url.searchParams.get('f') ?? 'jpg') === 'jpg')).toBe(true)
  })
})

test('an opted-in fallback replaces a denied private image without leaking its credentials', async ({
  page,
  context,
  audit,
}) => {
  await context.clearCookies()
  await page.route('**/api/browser-images?*', async (route) => {
    audit.expectedFailures.set(route.request().url(), 404)
    await route.continue()
  })
  await page.goto('/fixture/image-error')
  await expect(page.getByRole('status')).toHaveText('Sign in to see this image')
  await expect(page.getByRole('img', { name: 'Private preview' })).toHaveCount(0)
  expect(await page.content()).not.toContain(imageConfiguration.authSecret)
  await expect(page.getByRole('button', { name: 'Hydration count: 0' })).toBeVisible()
  await page.getByRole('button', { name: 'Hydration count: 0' }).click()
  const refreshed = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === '/fixture/image-error' && url.searchParams.has('_rsc')
  })
  await page.getByRole('button', { name: 'Sign in and refresh' }).click()
  expect((await refreshed).ok()).toBe(true)
  // Flight can stay open after React commits. Verify the completed user interaction below,
  // without buffering or waiting for EOF on the framework's streaming response.
  await expect(page.getByRole('button', { name: 'Sign in and refresh' })).toBeEnabled()
  await decode(page.getByRole('img', { name: 'Private preview' }))
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
  audit.committedRefreshes.add((await refreshed).request())
})

test('package Image decodes Storage and HTTP/S3 templates without an image-byte proxy', async ({
  page,
  context,
  audit,
}, info) => {
  await page.setViewportSize({ width: 1200, height: 1000 })
  await page.goto('/fixture/source-model')
  await expect(page.getByRole('heading', { name: 'Image sources' })).toBeVisible()
  await decode(page.getByRole('img', { name: 'Storage experiment', exact: true }))
  await decode(page.getByRole('img', { name: 'HTTP experiment', exact: true }))
  await decode(page.getByRole('img', { name: 'S3 experiment', exact: true }))
  await decode(page.getByRole('img', { name: 'Template experiment', exact: true }))
  const selected = await page.getByRole('img').evaluateAll((images) =>
    images.map((image) => {
      if (!(image instanceof HTMLImageElement)) throw new Error('Expected native image')
      return {
        alt: image.alt,
        width: image.getBoundingClientRect().width,
        url: image.currentSrc,
        leakedMode:
          image.hasAttribute('source') ||
          image.hasAttribute('workspace') ||
          image.hasAttribute('storage') ||
          image.hasAttribute('template'),
      }
    }),
  )
  expect(selected.every((image) => image.width === 320 && !image.leakedMode)).toBe(true)
  // The string Template source has intrinsic 2400px geometry, but must still fit a narrow box
  // without app-provided image CSS. Catalog and receipt sources use the same default.
  await page.setViewportSize({ width: 280, height: 1000 })
  const mobile = await page.getByRole('img').evaluateAll((images) =>
    images.map((image) => ({
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
    })),
  )
  expect(mobile.map((image) => image.width)).toEqual([264, 264, 264, 264])
  // Integer bitmap heights can differ slightly from the original's exact aspect ratio.
  expect(mobile.map((image) => Number((image.width / image.height).toFixed(2)))).toEqual([
    1.5, 1.5, 1.5, 1.5,
  ])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(280)
  await info.attach('image-sources-mobile', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await page.setViewportSize({ width: 1200, height: 1000 })
  expect(
    selected.map((image) => decodeURIComponent(new URL(image.url, page.url()).pathname)),
  ).toEqual([
    `/file/fixture/builtin/public-preview@0.0.2/${fixtureStorageIdentity('website/hero.jpg').asset_id}`,
    '/fixture/api/storage-images',
    '/fixture/api/storage-images',
    '/fixture/api/storage-images',
  ])
  expect(
    selected.slice(1).map((image) => new URL(image.url, page.url()).searchParams.get('template')),
  ).toEqual(['fixture-http', 'fixture-s3', 'fixture-http'])
  await expect
    .poll(() => audit.images.filter((image) => new URL(image.url).origin === cdnOrigin).length)
    .toBeGreaterThanOrEqual(3)
  expect(
    audit.images
      .filter((image) => new URL(image.url).origin === cdnOrigin)
      .map((image) => decodeURIComponent(new URL(image.url).pathname)),
  ).toEqual(
    expect.arrayContaining([
      `/file/fixture/builtin/public-preview@0.0.2/${fixtureStorageIdentity('website/hero.jpg').asset_id}`,
      '/file/fixture/fixture-http/website/hero.jpg',
      '/file/fixture/fixture-s3/products/hero.jpg',
    ]),
  )
  const privateImage = selected.find((image) => image.alt === 'HTTP experiment')
  assert(privateImage)
  const privateUrl = new URL(privateImage.url, page.url())
  const allowed = await page.request.get(privateUrl.href, { maxRedirects: 0 })
  expect(allowed.status()).toBe(307)
  expect(allowed.headers()['cache-control']).toBe('private, no-store')
  expect((await allowed.body()).length).toBe(0)
  await info.attach('image-sources', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  const wrongTemplate = new URL(privateUrl)
  wrongTemplate.searchParams.set('template', 'fixture-s3')
  expect((await page.request.get(wrongTemplate.href, { maxRedirects: 0 })).status()).toBe(404)
  const wrongWorkspace = new URL(privateUrl)
  wrongWorkspace.searchParams.set('workspace', 'other-workspace')
  expect((await page.request.get(wrongWorkspace.href, { maxRedirects: 0 })).status()).toBe(404)
  await context.clearCookies()
  expect((await page.request.get(privateUrl.href, { maxRedirects: 0 })).status()).toBe(404)
  await info.attach('source-authorization', {
    body: JSON.stringify({ allowed: 307, wrongTemplate: 404, wrongWorkspace: 404, anonymous: 404 }),
    contentType: 'application/json',
  })
})

test('the public catalog hero has stock-CSS geometry and no application image requests', async ({
  page,
}) => {
  const applicationImages: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/api/'))
      applicationImages.push(request.url())
  })
  await page.goto('/fixture/cli-image/app/storage-image-example')
  const hero = page.getByRole('img', { name: 'hero', exact: true })
  await decode(hero)
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('Expected a fixed viewport')
  expect((await hero.boundingBox())?.width).toBe(Math.min(960, viewport.width - 16))
  expect(applicationImages).toEqual([])
  expect(await hero.getAttribute('src')).toContain(cdnOrigin)
  expect(await hero.getAttribute('src')).not.toMatch(/auth_key=|sig=|exp=/)
  await expect(hero).toHaveAttribute('loading', 'eager')
  await expect(hero).toHaveAttribute('fetchpriority', 'high')
})

test('package imports render public and private images with the conventional cookie-authorized handler', async ({
  page,
  context,
}) => {
  const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
  const privateHash = catalog.images['documents/private/hero.jpg'].thumbhash
  expect(typeof privateHash).toBe('string')
  const response = await page.goto('/fixture/package-images')
  assert(response)
  const html = await response.text()
  expect(html).not.toContain(privateHash)
  expect(html).not.toContain('data:image/')
  const flight = await context.request.get('/fixture/package-images', { headers: { RSC: '1' } })
  expect(flight.ok()).toBe(true)
  expect(flight.headers()['content-type']).toContain('text/x-component')
  const payload = await flight.text()
  expect(payload).toContain('Package private image')
  expect(payload).not.toContain(privateHash)
  expect(payload).not.toContain('data:image/')
  await expect(page.getByRole('heading', { name: 'Images from the package' })).toBeVisible()
  const hero = page.getByRole('img', { name: 'Package hero', exact: true })
  const privateImage = page.getByRole('img', { name: 'Package private image', exact: true })
  await decode(hero)
  await decode(privateImage)
  await expect(privateImage).toHaveCSS('background-image', 'none')
  expect(await hero.getAttribute('src')).toContain(cdnOrigin)
  expect(await hero.getAttribute('src')).not.toMatch(/auth_key=|sig=|exp=/)
  const privateUrl = await privateImage.getAttribute('src')
  assert(privateUrl)
  expect(privateUrl).toMatch(/^\/fixture\/api\/storage-images\?cap=/)
  const granted = await context.request.head(privateUrl, { maxRedirects: 0 })
  expect(granted.status()).toBe(307)
  expect(await granted.body()).toHaveLength(0)
  await context.clearCookies()
  expect((await context.request.get(privateUrl, { maxRedirects: 0 })).status()).toBe(404)
  expect((await context.request.head(privateUrl, { maxRedirects: 0 })).status()).toBe(404)
  await expect(page.getByRole('button', { name: 'Hydration count: 0' })).toBeVisible()
  await page.getByRole('button', { name: 'Hydration count: 0' }).click()
  await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
})

if (process.env.IMG_FIXTURE_MODE === 'development') {
  test('development scaffold does not blame sizes when a cached desktop candidate is reused on mobile', async ({
    page,
  }) => {
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('[Image]'))
        warnings.push(message.text())
    })
    await page.setViewportSize({ width: 1200, height: 850 })
    await page.goto('/fixture/cli-image/app/storage-image-example')
    const hero = page.getByRole('img', { name: 'hero', exact: true })
    await decode(hero)
    await page.setViewportSize({ width: 390, height: 850 })
    await expect.poll(async () => (await hero.boundingBox())?.width).toBe(374)
    // Let native source selection finish before reload can cancel the mobile candidate.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await decode(hero)
    await page.reload()
    await decode(hero)
    await page.getByRole('button', { name: 'Hydration count: 0' }).click()
    await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    expect(warnings).toEqual([])
  })
  for (const viewportWidth of [390, 1200]) {
    test(`development scaffold does not warn that its untouched image is oversized at ${viewportWidth}px`, async ({
      page,
    }) => {
      const warnings: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'warning' && message.text().includes('[Image]'))
          warnings.push(message.text())
      })
      await page.setViewportSize({ width: viewportWidth, height: 850 })
      await page.goto('/fixture/cli-image/app/storage-image-example')
      const hero = page.getByRole('img', { name: 'hero', exact: true })
      await decode(hero)
      expect((await hero.boundingBox())?.width).toBe(Math.min(960, viewportWidth - 16))
      await page.getByRole('button', { name: 'Hydration count: 0' }).click()
      await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      expect(warnings).toEqual([])
    })
  }
  test('development scaffold waits for its real box after a temporary 1px layout', async ({
    page,
  }) => {
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('[Image]'))
        warnings.push(message.text())
    })
    await page.goto('/fixture/cli-image/app/storage-image-example')
    const hero = page.getByRole('img', { name: 'hero', exact: true })
    await decode(hero)
    await page.getByRole('button', { name: 'Hydration count: 0' }).click()
    await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
    // Change only layout: rewriting the dev HTML caused WebKit to reload and cancel resources.
    // Pre-layout scheduling is covered by unit tests; this proves native resize observation.
    const pendingLayout = await page.addStyleTag({
      content: 'picture{display:block;width:1px}',
    })
    await expect.poll(async () => (await hero.boundingBox())?.width).toBe(1)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    expect(warnings).toEqual([])
    await pendingLayout.evaluate((element) => element.parentNode?.removeChild(element))
    await expect.poll(async () => (await hero.boundingBox())?.width).toBe(960)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await expect(page.getByRole('button', { name: 'Hydration count: 1' })).toBeVisible()
    expect(warnings).toEqual([])
  })
}

test('the generated development scaffold shows a delivery failure instead of a blank page', async ({
  page,
  audit,
}) => {
  await page.route(`${cdnOrigin}/file/**`, (route) => {
    audit.expectedFailures.set(route.request().url(), 400)
    return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/fixture/cli-image/app/storage-image-example')
  await expect(
    page.getByRole('status').filter({ hasText: 'This image could not be loaded.' }),
  ).toHaveText('This image could not be loaded. Check the Storage path and delivery configuration.')
  await expect(page.getByRole('img', { name: 'hero', exact: true })).toHaveCount(0)
  if (process.env.IMG_FIXTURE_MODE === 'development') {
    // The browser-only failure stub does not affect the server's successful HEAD. Show that
    // precise result, rather than claiming to know why the browser request failed.
    const result = page.getByText(/^HEAD http.*HTTP 200\. See the terminal for details\.$/)
    await expect(result).toBeVisible()
    expect(await result.textContent()).not.toMatch(/[?#]|sig=|auth_key=|fixture-secret/)
  } else {
    await expect(page.getByText('See the terminal for details.', { exact: false })).toHaveCount(0)
  }
})

for (const viewportWidth of [390, 1200]) {
  test(`a small public original stays within its native width at ${viewportWidth}px`, async ({
    page,
    audit,
  }) => {
    await page.setViewportSize({ width: viewportWidth, height: 850 })
    await page.goto('/fixture/public-image')
    const image = page.getByRole('img', { name: 'Small public original', exact: true })
    await decode(image)
    expect((await image.boundingBox())?.width).toBe(320)
    expect((await image.boundingBox())?.height).toBe(240)
    await expect
      .poll(() =>
        audit.images.find((image) =>
          new URL(image.url).pathname.endsWith(
            `/${fixtureStorageIdentity('website/small.jpg').asset_id}`,
          ),
        ),
      )
      .toMatchObject({ width: 320, height: 240 })
  })
}

test('the generated empty catalog page works before the first upload', async ({ page }) => {
  await page.goto('/fixture/cli-empty/app/storage-image-example')
  await expect(
    page.getByText('npx transloadit storage store ./hero.jpg website/hero.jpg', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByRole('img')).toHaveCount(0)
})

test('unsigned public Built-ins refuse private paths and private Built-ins never downgrade', async ({
  context,
}) => {
  const publicUrl = new URL(
    `${cdnOrigin}/file/fixture/builtin%2Fpublic-preview%400.0.2/${fixtureStorageIdentity('website/hero.jpg').asset_id}?w=400&h=300&r=pad&f=webp&bg=%2300000000&v=${fixtureStorageIdentity('website/hero.jpg').version_id}`,
  )
  expect((await context.request.get(publicUrl.href)).status()).toBe(200)
  expect((await context.request.head(publicUrl.href)).headers()['cache-control']).toContain(
    'immutable',
  )
  publicUrl.searchParams.set('sig', 'sha256:invalid')
  expect((await context.request.get(publicUrl.href)).status()).toBe(403)
  publicUrl.searchParams.delete('sig')
  publicUrl.searchParams.delete('v')
  expect((await context.request.get(publicUrl.href)).status()).toBe(403)
  publicUrl.searchParams.set('v', fixtureStorageIdentity('documents/private/hero.jpg').version_id)
  expect((await context.request.get(publicUrl.href)).status()).toBe(403)
  publicUrl.pathname = `/file/fixture/builtin%2Fpublic-preview%400.0.2/${fixtureStorageIdentity('documents/private/hero.jpg').asset_id}`
  expect((await context.request.get(publicUrl.href)).status()).toBe(403)
  publicUrl.pathname = `/file/fixture/builtin%2Fstorage-preview%400.0.3/${fixtureStorageIdentity('website/hero.jpg').asset_id}`
  publicUrl.searchParams.set('v', fixtureStorageIdentity('website/hero.jpg').version_id)
  expect((await context.request.get(publicUrl.href)).status()).toBe(403)
})

for (const width of [390, 1200]) {
  test(`the packed hashed upload decodes at ${width}px with its catalog identity`, async ({
    page,
  }, info) => {
    const { path, receipt, assemblies } = JSON.parse(await readFile('hashed-upload.json', 'utf8'))
    expect(assemblies).toBe(1)
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/fixture/package-hashed')
    const image = page.getByRole('img', { name: 'Content-addressed hero', exact: true })
    await decode(image)
    const current = await image.evaluate((element) => {
      if (!(element instanceof HTMLImageElement)) throw new Error('Expected the hashed image')
      return element.currentSrc
    })
    const url = new URL(current)
    expect(decodeURIComponent(url.pathname)).toBe(
      `/file/fixture/builtin/public-preview@0.0.2/${receipt.asset_id}`,
    )
    expect(url.searchParams.get('v')).toBe(receipt.version_id)
    expect(url.searchParams.has('sig')).toBe(false)
    await info.attach('hashed-upload', {
      body: JSON.stringify({
        path,
        receipt,
        assemblies,
        currentSrc: current,
        viewport: { width, height: 850 },
      }),
      contentType: 'application/json',
    })
    await info.attach('hashed-image', { body: await page.screenshot(), contentType: 'image/png' })
  })
}

test.describe('server-only blur placeholders', () => {
  test.use({ javaScriptEnabled: false })

  test('the packaged public image embeds its blur before native delivery', async ({
    page,
    browserName,
  }, testInfo) => {
    const delivery = Promise.withResolvers<void>()
    await page.route(`${cdnOrigin}/**`, async (route) => {
      await delivery.promise
      await route.continue()
    })
    try {
      await page.goto('/fixture/package-public', { waitUntil: 'domcontentloaded' })
      const image = page.getByRole('img', { name: 'Package public hero', exact: true })
      await expect(image).toHaveJSProperty('naturalWidth', 0)
      await expect(image).toHaveCSS('background-image', /^url\("data:image\/png;base64,/)
      await expect(image).not.toHaveAttribute('onload')
      await testInfo.attach('blur-before-load', {
        // Screenshots await document.fonts.ready, which can await load while this image is held.
        body: JSON.stringify(
          await image.evaluate((element) => ({
            background: getComputedStyle(element).backgroundImage,
            width: element.getBoundingClientRect().width,
            height: element.getBoundingClientRect().height,
          })),
        ),
        contentType: 'application/json',
      })
      if (browserName === 'chromium') {
        // CDP captures pixels without awaiting document.fonts.ready while delivery is held.
        const session = await page.context().newCDPSession(page)
        const { data } = await session.send('Page.captureScreenshot', { format: 'png' })
        await session.detach()
        const screenshot = Buffer.from(data, 'base64')
        await testInfo.attach('blur-before-load-pixels', {
          body: screenshot,
          contentType: 'image/png',
        })
        const box = await image.boundingBox()
        assert(box)
        const pixel = await sharp(screenshot)
          .extract({
            left: Math.floor(box.x + box.width / 2),
            top: Math.floor(box.y + box.height / 2),
            width: 1,
            height: 1,
          })
          .removeAlpha()
          .raw()
          .toBuffer()
        expect(pixel[0]).toBeCloseTo(45, -1)
        expect(pixel[1]).toBeCloseTo(110, -1)
        expect(pixel[2]).toBeCloseTo(160, -1)
      }
      delivery.resolve()
      await decode(image)
      await expect(image).toHaveCSS('background-image', /^url\("data:image\/png;base64,/)
      await testInfo.attach('blur-after-load', {
        body: await page.screenshot(),
        contentType: 'image/png',
      })
    } finally {
      delivery.resolve()
    }
  })

  test('a transparent public image never paints a blur behind its alpha pixels', async ({
    page,
    audit,
  }, testInfo) => {
    await page.goto('/fixture/package-alpha')
    const image = page.getByRole('img', { name: 'Transparent public image', exact: true })
    await decode(image)
    await expect(image).toHaveCSS('background-image', 'none')
    await expect(image).not.toHaveAttribute('onload')
    await expect
      .poll(
        () =>
          audit.images.find((entry) =>
            new URL(entry.url).pathname.endsWith(
              `/${fixtureStorageIdentity('website/alpha.png').asset_id}`,
            ),
          )?.corner?.[3],
      )
      .toBe(0)
    const letterbox = page.getByRole('img', { name: 'Letterboxed public image', exact: true })
    await decode(letterbox)
    await expect(letterbox).toHaveCSS('background-image', 'none')
    await expect(letterbox).toHaveCSS('object-fit', 'contain')
    const letterboxPixels = await sharp(await letterbox.screenshot())
      .extract({ left: 150, top: 10, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer()
    expect([...letterboxPixels]).toEqual([255, 255, 255])
    await testInfo.attach('transparent-no-blur', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
  })
})

test('short public AVIF, WebP and JPEG candidates all decode natively', async ({
  page,
  context,
}) => {
  await page.goto('/fixture/package-public')
  const image = page.getByRole('img', { name: 'Package public hero', exact: true })
  await decode(image)
  const picture = image.locator('..')
  const jpeg = await image.getAttribute('src')
  const avif = (await picture.locator('source[type="image/avif"]').getAttribute('srcset'))?.split(
    ' ',
  )[0]
  const webp = (await picture.locator('source[type="image/webp"]').getAttribute('srcset'))?.split(
    ' ',
  )[0]
  for (const [candidate, mime] of [
    [avif, 'image/avif'],
    [webp, 'image/webp'],
    [jpeg, 'image/jpeg'],
  ]) {
    assert(candidate)
    const url = new URL(candidate)
    expect(url.searchParams.has('r')).toBe(false)
    expect(url.searchParams.has('cdn')).toBe(false)
    if (mime === 'image/jpeg') {
      expect(url.searchParams.has('f')).toBe(false)
      expect(url.searchParams.has('bg')).toBe(false)
      expect(url.searchParams.has('q')).toBe(false)
    }
    const response = await context.request.get(url.href)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(mime)
    const decoded = await page.evaluate(async (url) => {
      const candidate = new Image()
      candidate.src = url
      await candidate.decode()
      return { width: candidate.naturalWidth, height: candidate.naturalHeight }
    }, url.href)
    expect(decoded.width).toBe(Number(url.searchParams.get('w')))
    expect(decoded.height).toBe(Number(url.searchParams.get('h')))
  }
})

test('a portrait fill layout downloads the cropped box rather than an oversized landscape', async ({
  page,
}) => {
  const requestOffset = cdn.requests.length
  await page.goto('/fixture/layouts')
  const image = page.getByRole('img', { name: 'Portrait cover' })
  await decode(image)
  expect((await image.boundingBox())?.width).toBe(390)
  expect((await image.boundingBox())?.height).toBeCloseTo((390 * 16) / 9, 1)
  const requests = cdn.requests.slice(requestOffset)
  expect(requests).toHaveLength(1)
  assert(requests[0])
  const parameters = new URL(requests[0].url).searchParams
  expect(parameters.get('r')).toBe('fillcrop')
  expect(parameters.get('w')).toBe('390')
  expect(parameters.get('h')).toBe('693')
  await expect(image).toHaveJSProperty('naturalWidth', 390)
  await expect(image).toHaveJSProperty('naturalHeight', 693)
})

test('an original lazy capability gets a new grant after its earlier target expires', async ({
  page,
  audit,
}) => {
  await page.goto('/fixture/browser')
  await decode(page.getByRole('img', { name: 'Private hero', exact: true }))
  const lazy = page.getByRole('img', { name: 'Late private preview' })
  const candidate = await lazy.evaluate(
    (image) => image.parentElement?.querySelector('source')?.srcset.split(' ')[0],
  )
  assert(candidate)
  const capability = new URL(candidate, page.url()).href
  const initial = await audit.loadNativeImage(capability)
  expect(initial.loaded).toBe(true)
  expect(initial.status).toBe(307)
  const oldTarget = initial.headers.location
  assert(oldTarget)
  await expect(lazy).toHaveJSProperty('naturalWidth', 0)
  await waitForExpiry(oldTarget)
  const renewal = redirectResponse(page, capability)
  await lazy.scrollIntoViewIfNeeded()
  const renewed = await renewal
  await decode(lazy)
  expect(renewed.status()).toBe(307)
  const target = renewed.headers().location
  assert(target)
  expect(Number(new URL(target).searchParams.get('exp'))).toBeGreaterThan(
    Number(new URL(oldTarget).searchParams.get('exp')),
  )
  expect(
    await lazy.evaluate((image) => (image instanceof HTMLImageElement ? image.currentSrc : null)),
  ).toBe(capability)
})

test('revocation denies new grants but an issued CDN target works until its own expiry', async ({
  page,
  audit,
}) => {
  const initial = page.waitForResponse(
    (response) => response.status() === 307 && response.url().includes('/api/browser-images'),
  )
  await page.goto('/fixture/browser')
  await decode(page.getByRole('img', { name: 'Private hero', exact: true }))
  await decode(page.getByRole('img', { name: 'Private avatar', exact: true }))
  const issued = await initial
  const capability = issued.url()
  const target = issued.headers().location
  assert(target)
  await writeFile(revokedAccessFile, 'revoked\n')
  audit.expectedFailures.set(capability, 404)
  const requestsBefore = cdn.requests.length
  const denied = await audit.loadNativeImage(capability)
  expect(denied.loaded).toBe(false)
  expect(denied.status).toBe(404)
  expect(denied.headers['cache-control']).toBe('private, no-store')
  expect(denied.headers.location).toBeUndefined()
  expect(denied.bodyLength).toBe(0)
  expect(cdn.requests).toHaveLength(requestsBefore)
  expect((await audit.loadNativeImage(target)).loaded).toBe(true)
  await waitForExpiry(target)
  audit.expectedFailures.set(target, 403)
  expect((await audit.loadNativeImage(target)).loaded).toBe(false)
  expect(cdn.requests.at(-1)?.status).toBe(403)
})

test('native requests cannot use altered capabilities or CDN signatures', async ({
  page,
  audit,
  context,
}) => {
  const initial = page.waitForResponse(
    (response) => response.status() === 307 && response.url().includes('/api/private-images'),
  )
  await page.goto('/fixture/storage-redirect')
  await decode(page.getByRole('img', { name: 'Authorized Storage fixture' }))
  const issued = await initial
  const altered = new URL(issued.url())
  const cap = altered.searchParams.get('cap')
  assert(cap)
  altered.searchParams.set('cap', `${cap[0] === 'A' ? 'B' : 'A'}${cap.slice(1)}`)
  audit.expectedFailures.set(altered.href, 404)
  expect((await audit.loadNativeImage(altered.href)).loaded).toBe(false)
  const target = new URL(issued.headers().location ?? '')
  target.searchParams.set('sig', `sha256:${'0'.repeat(64)}`)
  audit.expectedFailures.set(target.href, 403)
  expect((await audit.loadNativeImage(target.href)).loaded).toBe(false)
  await context.clearCookies()
  audit.expectedFailures.set(issued.url(), 404)
  expect((await audit.loadNativeImage(issued.url())).loaded).toBe(false)
})

test('dynamic React receipts decode and refresh after the signed CDN URL expires', async ({
  page,
  audit,
  context,
}, info) => {
  const redirected = page
    .waitForResponse(
      (response) => response.status() === 307 && response.url().includes('/api/transloadit/media'),
    )
    .then((response) => ({ response, receivedAt: Date.now() }))
  await page.goto('/fixture/dynamic-storage')
  const avatar = page.getByRole('img', { name: 'Dynamic avatar', exact: true })
  await decode(avatar)
  await expect(avatar).toHaveAttribute('width', '400')
  await expect(avatar).toHaveAttribute('height', '300')
  const { response: issued, receivedAt } = await redirected
  expect(issued.headers()['cache-control']).toBe('private, no-store')
  expect(issued.headers().vary?.split(/,\s*/)).toEqual(
    expect.arrayContaining(['Cookie', 'Authorization']),
  )
  const location = issued.headers().location
  assert(location)
  const target = new URL(location)
  expect(target.origin).toBe(cdnOrigin)
  expect(target.pathname.split('/').map(decodeURIComponent)).toContain(
    'builtin/storage-preview@0.0.3',
  )
  expect(target.pathname.split('/').at(-1)).toBe(
    fixtureStorageIdentity('documents/avatar.jpg').asset_id,
  )
  const remainingMs = Number(target.searchParams.get('exp')) - receivedAt
  expect(remainingMs).toBeGreaterThan(0)
  expect(remainingMs).toBeLessThanOrEqual(1000)
  await expect
    .poll(async () => (await context.request.get(location, { maxRedirects: 0 })).status(), {
      timeout: 5000,
    })
    .toBe(403)
  await page.getByRole('button', { name: 'Refresh receipt: 0' }).click()
  await expect(page.getByRole('button', { name: 'Refresh receipt: 1' })).toBeVisible()
  expect((await audit.loadNativeImage(issued.url())).loaded).toBe(true)
  const refreshed = await context.request.head(issued.url(), { maxRedirects: 0 })
  expect(refreshed.status()).toBe(307)
  expect(refreshed.headers().location).not.toBe(location)
  expect((await refreshed.body()).length).toBe(0)
  await info.attach('dynamic-receipt-image', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('dynamic route rejects unauthorized variants and live permission loss', async ({
  page,
  audit,
  context,
}) => {
  const redirected = page.waitForResponse(
    (response) => response.status() === 307 && response.url().includes('/api/transloadit/media'),
  )
  await page.goto('/fixture/dynamic-storage')
  await decode(page.getByRole('img', { name: 'Dynamic avatar', exact: true }))
  const issued = await redirected
  const variant = new URL(issued.url())
  variant.searchParams.set('w', '8000')
  audit.expectedFailures.set(variant.href, 404)
  expect((await audit.loadNativeImage(variant.href)).loaded).toBe(false)
  const duplicate = `${issued.url()}&w=320`
  expect((await context.request.head(duplicate, { maxRedirects: 0 })).status()).toBe(404)
  await writeFile(revokedAccessFile, 'revoked\n')
  const denied = await context.request.head(issued.url(), { maxRedirects: 0 })
  expect(denied.status()).toBe(404)
  expect(denied.headers()['cache-control']).toBe('private, no-store')
  audit.expectedFailures.set(issued.url(), 404)
  expect((await audit.loadNativeImage(issued.url())).loaded).toBe(false)
  await context.clearCookies()
  expect((await context.request.get(issued.url(), { maxRedirects: 0 })).status()).toBe(404)
})

test('dynamic download preserves exact-version bytes and the trusted receipt filename', async ({
  page,
  context,
  audit,
}) => {
  await page.goto('/fixture/dynamic-storage')
  await decode(page.getByRole('img', { name: 'Dynamic avatar', exact: true }))
  const link = page.getByRole('link', { name: 'Download avatar' })
  const href = await link.getAttribute('href')
  assert(href)
  const before = await context.request.head(href, { maxRedirects: 0 })
  expect(before.status()).toBe(307)
  expect(before.headers()['cache-control']).toBe('private, no-store')
  const delivered = await context.request.get(href)
  expect(delivered.status()).toBe(200)
  expect(delivered.headers()['content-disposition']).toBe('attachment; filename="avatar.jpg"')
  expect((await sharp(await delivered.body()).metadata()).width).toBe(400)
  const downloadEvent = page.waitForEvent('download')
  await link.click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('avatar.jpg')
  expect(await download.failure()).toBeNull()
  audit.completedDownloads.add(new URL(href, page.url()).href)
  audit.completedDownloads.add(download.url())
  const original = new URL(href, page.url())
  original.searchParams.set('action', 'original')
  expect((await context.request.get(original.href, { maxRedirects: 0 })).status()).toBe(404)
})
