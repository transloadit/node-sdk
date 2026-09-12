import type { Locator, Page, Response, Route } from '@playwright/test'

import assert from 'node:assert/strict'
import { readFile, rm, writeFile } from 'node:fs/promises'

import { test as base, expect } from '@playwright/test'
import sharp from 'sharp'

import { imageConfiguration } from './app/imageConfiguration.ts'
import { startFixtureCdn } from './browser-cdn.ts'
import { revokedAccessFile } from './browser-policy.ts'

declare global {
  interface Window {
    fixtureLcpMs: number
  }
}

interface ImageEvidence {
  bytes: number
  contentType: string | undefined
  height: number | undefined
  url: string
  width: number | undefined
}

interface BrowserAudit {
  expectedFailures: Map<string, number>
  images: ImageEvidence[]
}

const cdnOrigin = process.env.IMG_FIXTURE_CDN_ORIGIN
assert(cdnOrigin, 'The packed fixture must provide its own CDN origin')
let cdn: Awaited<ReturnType<typeof startFixtureCdn>>

const test = base.extend<{ audit: BrowserAudit }>({
  audit: [
    async ({ page, context }, use, info) => {
      const expectedFailures = new Map<string, number>()
      const images: ImageEvidence[] = []
      const errors: string[] = []
      const reads: Promise<void>[] = []
      // The empty scaffold intentionally has no favicon; it is not an image delivery failure.
      expectedFailures.set(new URL('/favicon.ico', info.project.use.baseURL).href, 404)
      await rm(revokedAccessFile, { force: true })
      await context.addCookies([
        {
          name: 'fixture-session',
          value: 'fixture',
          domain: '127.0.0.1',
          path: '/fixture',
          httpOnly: true,
          sameSite: 'Strict',
        },
      ])
      await page.addInitScript(() => {
        window.fixtureLcpMs = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.fixtureLcpMs = entry.startTime
        }).observe({ buffered: true, type: 'largest-contentful-paint' })
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
        if (!expectedFailures.has(request.url())) errors.push(`Failed request: ${request.url()}`)
      })
      page.on('response', (response) => {
        if (
          response.status() >= 400 &&
          expectedFailures.get(response.url()) !== response.status()
        ) {
          errors.push(`HTTP ${response.status()}: ${response.url()}`)
        }
        if (response.ok() && response.request().resourceType() === 'image') {
          reads.push(
            (async () => {
              const bytes = await response.body()
              const metadata = await sharp(bytes).metadata()
              images.push({
                bytes: bytes.length,
                contentType: response.headers()['content-type'],
                height: metadata.height,
                width: metadata.width,
                url: response.url(),
              })
            })(),
          )
        }
      })
      await use({ expectedFailures, images })
      await Promise.all(reads)
      await info.attach('native-image-responses', {
        body: JSON.stringify({ images, errors, expectedFailures: [...expectedFailures] }, null, 2),
        contentType: 'application/json',
      })
      expect(errors).toEqual([])
      expect(images.every((image) => new URL(image.url).origin === cdnOrigin)).toBe(true)
      expect(images.every((image) => !image.url.includes(imageConfiguration.authSecret))).toBe(true)
      for (const image of images) {
        const url = new URL(image.url)
        expect(image.width).toBe(Number(url.searchParams.get('w')))
        expect(image.height).toBe(Number(url.searchParams.get('h')))
        expect(image.contentType).toBe(
          `image/${url.searchParams.get('f') === 'jpg' ? 'jpeg' : url.searchParams.get('f')}`,
        )
      }
      await rm(revokedAccessFile, { force: true })
    },
    { auto: true },
  ],
})

test.beforeAll(async () => {
  cdn = await startFixtureCdn(cdnOrigin)
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

function loadNativeImage(page: Page, url: string): Promise<boolean> {
  return page.evaluate(async (src) => {
    const image = new Image()
    image.src = src
    try {
      await image.decode()
      return true
    } catch {
      return false
    }
  }, url)
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
  expect(await response.request().headerValue('cookie')).toBe('fixture-session=fixture')
  expect(response.status()).toBe(307)
  expect(response.headers()['cache-control']).toBe('private, no-store')
  await decode(page.getByRole('img', { name: 'Authorized Storage fixture' }))
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'fixture-session')?.httpOnly,
  ).toBe(true)
  expect(await page.evaluate(() => document.cookie)).toBe('')
  expect(await page.content()).not.toContain(imageConfiguration.authSecret)
})

for (const width of [1200, 390]) {
  test(`hero and avatar reserve layout before signing and hydrate with delayed JS at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    const shell = await readFile('.next/server/app/storage-image.html', 'utf8')
    expect(shell).not.toContain('builtin%2Fstorage-preview')
    // Render the actual production prerender artifact, then compare with a real streamed request.
    await page.route('**/fixture/storage-image', (route) =>
      route.fulfill({ contentType: 'text/html', body: shell }),
    )
    const emptyScript = (route: Route): Promise<void> =>
      route.fulfill({ contentType: 'text/javascript', body: '' })
    await page.route('**/_next/**/*.js*', emptyScript)
    await page.goto('/fixture/storage-image')
    const afterHero = page.getByText('After the hero', { exact: true })
    const afterAvatar = page.getByText('After the avatar', { exact: true })
    const pendingHero = await afterHero.boundingBox()
    const pendingAvatar = await afterAvatar.boundingBox()
    await info.attach('prerendered-shell', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
    await page.unroute('**/fixture/storage-image')
    await page.unroute('**/_next/**/*.js*', emptyScript)
    const scripts = Promise.withResolvers<void>()
    let scriptsWaiting = 0
    await page.route('**/_next/**/*.js*', async (route) => {
      scriptsWaiting += 1
      await scripts.promise
      await route.continue()
    })
    const started = performance.now()
    try {
      await page.goto('/fixture/storage-image', { waitUntil: 'commit' })
      await decode(page.getByRole('img', { name: 'Storage hero' }))
      await decode(page.getByRole('img', { name: 'Storage avatar' }))
      expect(scriptsWaiting).toBeGreaterThan(0)
      expectSameBox(await afterHero.boundingBox(), pendingHero)
      expectSameBox(await afterAvatar.boundingBox(), pendingAvatar)
      const hero = page.getByRole('img', { name: 'Storage hero' })
      const currentSrc = await hero.evaluate((element) => {
        if (!(element instanceof HTMLImageElement)) throw new Error('Expected image')
        return element.currentSrc
      })
      expect(new URL(currentSrc).searchParams.get('w')).toBe(width === 1200 ? '960' : '640')
      await expect(page.getByRole('img', { name: 'Storage avatar' })).toHaveJSProperty(
        'naturalWidth',
        48,
      )
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
    expectSameBox(await afterHero.boundingBox(), pendingHero)
    expectSameBox(await afterAvatar.boundingBox(), pendingAvatar)
    await page.goto('/fixture/browser')
    await decode(page.getByRole('img', { name: 'Private hero', exact: true }))
    await decode(page.getByRole('img', { name: 'Private avatar', exact: true }))
    await expect(page.getByRole('img', { name: 'Private avatar', exact: true })).toHaveJSProperty(
      'naturalWidth',
      48,
    )
  })
}

test('an original lazy capability gets a new grant after its earlier target expires', async ({
  page,
}) => {
  await page.goto('/fixture/browser')
  await decode(page.getByRole('img', { name: 'Private hero', exact: true }))
  const lazy = page.getByRole('img', { name: 'Late private preview' })
  const candidate = await lazy.evaluate(
    (image) => image.parentElement?.querySelector('source')?.srcset.split(' ')[0],
  )
  assert(candidate)
  const capability = new URL(candidate, page.url()).href
  const initial = redirectResponse(page, capability)
  expect(await loadNativeImage(page, capability)).toBe(true)
  const oldTarget = (await initial).headers().location
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
  const deniedResponse = redirectResponse(page, capability)
  const requestsBefore = cdn.requests.length
  expect(await loadNativeImage(page, capability)).toBe(false)
  const denied = await deniedResponse
  expect(denied.status()).toBe(404)
  expect(denied.headers()['cache-control']).toBe('private, no-store')
  expect(denied.headers().location).toBeUndefined()
  expect(await denied.body()).toHaveLength(0)
  expect(cdn.requests).toHaveLength(requestsBefore)
  expect(await loadNativeImage(page, target)).toBe(true)
  await waitForExpiry(target)
  audit.expectedFailures.set(target, 403)
  expect(await loadNativeImage(page, target)).toBe(false)
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
  expect(await loadNativeImage(page, altered.href)).toBe(false)
  const target = new URL(issued.headers().location ?? '')
  target.searchParams.set('sig', `sha256:${'0'.repeat(64)}`)
  audit.expectedFailures.set(target.href, 403)
  expect(await loadNativeImage(page, target.href)).toBe(false)
  await context.clearCookies()
  audit.expectedFailures.set(issued.url(), 404)
  expect(await loadNativeImage(page, issued.url())).toBe(false)
})
