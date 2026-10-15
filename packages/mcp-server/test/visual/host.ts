import type { FrameLocator, Locator, Page } from '@playwright/test'

import type { WidgetStateFixture } from './fixtures.ts'

import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

import { assemblyResultWidgetHtml } from '../../src/ui/assembly-result-widget.ts'
import { missingMediaSegment, resultOrigin, uploadOrigin } from './fixtures.ts'

/** Which host API the widget is embedded in. */
export type HostKind = 'mcp' | 'openai'
export type Theme = 'light' | 'dark'

/** Inline widths of a phone-sized chat and a desktop chat column. */
export const widths = [360, 760] as const
export const themes: Theme[] = ['light', 'dark']
export const hostKinds: HostKind[] = ['mcp', 'openai']

/** Origin the fake host page is served from; `baseURL` in playwright.config.ts. */
export const hostOrigin = 'https://host.test'

type JsonRpcMessage = Record<string, unknown>

interface HostLogEntry {
  at: number
  message: JsonRpcMessage
}

interface HostConfig {
  html: string
  width: number
  theme: Theme
  /** `ignore` leaves `ui/initialize` unanswered, as a host without the MCP Apps bridge does. */
  initialize: 'accept' | 'reject' | 'ignore'
  /** Height the frame has before the widget reports one; real hosts start with a placeholder. */
  initialHeight: number
}

declare global {
  interface Window {
    hostLog: HostLogEntry[]
    mountWidget: (config: HostConfig) => void
    sendToWidget: (message: JsonRpcMessage) => void
    widgetWindow: () => Window & typeof globalThis
    openai?: Record<string, unknown>
  }
}

// A minimal MCP Apps host: it answers the handshake, sizes the frame from size-changed and draws
// the border the widget asks for with `prefersBorder`. By default the frame starts at zero height,
// so every pixel of its final height comes from what the widget reported.
const hostPageHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fake chat host</title>
<style>
  :root { color-scheme: light; --page: #ffffff; --edge: #0000001f; }
  :root[data-theme="dark"] { color-scheme: dark; --page: #212121; --edge: #ffffff26; }
  body { margin: 0; padding: 16px; background: var(--page); }
  .card { display: inline-block; border: 1px solid var(--edge); border-radius: 12px; overflow: hidden; }
  iframe { display: block; border: 0; }
</style>
</head>
<body>
<div class="card" id="card"></div>
<script>
  window.hostLog = []
  window.mountWidget = (config) => {
    document.documentElement.dataset.theme = config.theme
    const frame = document.createElement('iframe')
    frame.title = 'Assembly result'
    frame.style.width = config.width + 'px'
    frame.style.height = config.initialHeight + 'px'
    const send = (message) => frame.contentWindow.postMessage(message, '*')
    window.sendToWidget = send
    window.widgetWindow = () => frame.contentWindow
    window.addEventListener('message', (event) => {
      if (event.source !== frame.contentWindow) return
      const message = event.data
      window.hostLog.push({ at: performance.now(), message })
      if (message.method === 'ui/notifications/size-changed') {
        frame.style.height = message.params.height + 'px'
        return
      }
      if (message.method !== 'ui/initialize' || config.initialize === 'ignore') return
      if (config.initialize === 'reject') {
        send({ jsonrpc: '2.0', id: message.id, error: { code: -32602, message: 'Invalid params for ui/initialize' } })
        return
      }
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2026-01-26',
          hostInfo: { name: 'FakeHost', version: '1.0.0' },
          hostCapabilities: { openLinks: {} },
          hostContext: { theme: config.theme, displayMode: 'inline' },
        },
      })
    })
    frame.srcdoc = config.html
    document.getElementById('card').append(frame)
  }
</script>
</body>
</html>
`

const mediaDir = join(import.meta.dirname, 'media')
const mediaFiles: Record<string, { file: string; contentType: string }> = {
  // Chromium sniffs images, so a .jpg can carry png bytes. Playwright's Chromium has no H.264,
  // so an .mp4 name is served as the webm clip with its real type.
  '.jpg': { file: 'photo.png', contentType: 'image/jpeg' },
  '.mp3': { file: 'tone.mp3', contentType: 'audio/mpeg' },
  '.mp4': { file: 'clip.webm', contentType: 'video/webm' },
  '.png': { file: 'photo.png', contentType: 'image/png' },
  '.webm': { file: 'clip.webm', contentType: 'video/webm' },
}

/**
 * Serves the host page and every result/upload URL from local files, so nothing reaches the
 * network. Returns the media URLs the widget requested, in order, to detect reloads.
 */
export const routeHostAndMedia = async (
  page: Page,
  options: { latencyMs?: number } = {},
): Promise<string[]> => {
  const mediaRequests: string[] = []
  // Anything else would be a network request this harness does not expect. Playwright tries the
  // most recently registered route first, so this catch-all goes in before the specific ones.
  await page.route(/^https?:\/\//, (route) => route.abort('blockedbyclient'))
  await page.route(`${hostOrigin}/**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: hostPageHtml }),
  )
  for (const origin of [resultOrigin, uploadOrigin]) {
    await page.route(`${origin}/**`, async (route) => {
      const url = route.request().url()
      mediaRequests.push(url)
      const media = mediaFiles[extname(new URL(url).pathname)]
      if (options.latencyMs) await new Promise((resolve) => setTimeout(resolve, options.latencyMs))
      if (url.includes(missingMediaSegment) || !media) {
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
        return
      }
      await route.fulfill({
        contentType: media.contentType,
        body: await readFile(join(mediaDir, media.file)),
      })
    })
  }
  return mediaRequests
}

/** `window.openai` as ChatGPT hands it to a widget, before the widget script runs. */
const withOpenAiGlobals = (fixture: WidgetStateFixture, theme: Theme): string => {
  const globals = {
    theme,
    displayMode: 'inline',
    maxHeight: 480,
    locale: 'en-US',
    toolInput: {},
    toolOutput: fixture.result?.structuredContent ?? null,
    toolResponseMetadata: fixture.result?._meta ?? null,
  }
  const script = `<script>window.openai = ${JSON.stringify(globals).replaceAll('<', '\\u003c')}</script>`
  return assemblyResultWidgetHtml.replace('<head>', `<head>\n${script}`)
}

interface MountedWidget {
  /** The bordered card around the frame, which is what a user sees in the chat. */
  card: Locator
  frame: FrameLocator
  sendToWidget: (message: JsonRpcMessage) => Promise<void>
  hostLog: () => Promise<JsonRpcMessage[]>
}

/** Opens the fake host and plays the fixture's host messages to the widget. */
export const mountWidget = async (
  page: Page,
  options: {
    fixture: WidgetStateFixture
    host: HostKind
    theme: Theme
    width: number
    initialHeight?: number
  },
): Promise<MountedWidget> => {
  const { fixture, host, theme, width, initialHeight = 0 } = options
  // The rejected-handshake state never learns the host theme, so it follows the system one.
  await page.emulateMedia({ colorScheme: theme })
  await page.goto('/')
  await page.evaluate((config) => window.mountWidget(config), {
    html: host === 'openai' ? withOpenAiGlobals(fixture, theme) : assemblyResultWidgetHtml,
    width,
    theme,
    initialize: host === 'openai' ? 'ignore' : fixture.initialize,
    initialHeight,
  } satisfies HostConfig)

  const frame = page.frameLocator('iframe[title="Assembly result"]')
  const sendToWidget = async (message: JsonRpcMessage): Promise<void> => {
    await page.evaluate((payload) => window.sendToWidget(payload), message)
  }
  const hostLog = (): Promise<JsonRpcMessage[]> =>
    page.evaluate(() => window.hostLog.map((entry) => entry.message))

  if (host === 'mcp' && fixture.initialize === 'accept') {
    await page.waitForFunction(() =>
      window.hostLog.some((entry) => entry.message.method === 'ui/notifications/initialized'),
    )
    if (fixture.toolInput) {
      await sendToWidget({
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-input',
        params: { arguments: { instructions: { steps: {} }, wait_for_completion: true } },
      })
    }
    if (fixture.cancelled) {
      await sendToWidget({
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-cancelled',
        params: { reason: 'The user stopped the response.' },
      })
    }
    if (fixture.result) {
      await sendToWidget({
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: fixture.result,
      })
    }
  }

  // Generous because a preview that never loads only gives up after its 1 s + 3 s + 6 s retries.
  await frame.getByText(fixture.waitForText).first().waitFor({ timeout: 20_000 })
  return { card: page.locator('#card'), frame, sendToWidget, hostLog }
}

/** Counts previews that are still loading, waiting up to `timeoutMs` for them to finish. */
const pendingMedia = (frame: FrameLocator, timeoutMs: number): Promise<number> =>
  frame.locator('body').evaluate(async (body, timeout) => {
    const settled = (element: Element): boolean => {
      if (element instanceof HTMLImageElement) return element.complete
      if (element instanceof HTMLMediaElement)
        return element.readyState >= 2 || element.error !== null
      return true
    }
    const waitFor = (element: Element): Promise<unknown> =>
      new Promise((resolve) => {
        for (const type of ['load', 'loadeddata', 'error']) {
          element.addEventListener(type, resolve, { once: true })
        }
      })
    const media = [...body.querySelectorAll('img, video, audio')].filter(
      (element) => !settled(element),
    )
    await Promise.race([
      Promise.all(media.map(waitFor)),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ])
    return [...body.querySelectorAll('img, video, audio')].filter((element) => !settled(element))
      .length
  }, timeoutMs)

/**
 * Waits until previews have loaded (or failed) and the host applied the last reported height.
 * Lazy images only load near the top-level viewport, so the page grows with the frame until
 * every preview below the fold had its chance.
 */
export const settleWidget = async (page: Page, frame: FrameLocator): Promise<void> => {
  const width = page.viewportSize()?.width ?? 860
  for (let round = 0; round < 10; round += 1) {
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width, height: Math.max(900, pageHeight) })
    if ((await pendingMedia(frame, 2000)) === 0) break
  }
  await page.waitForFunction(() => {
    const frame = document.querySelector('iframe')
    const root = frame?.contentDocument?.documentElement
    return root !== undefined && root !== null && frame?.offsetHeight === root.scrollHeight
  })
}

/**
 * Sizes the frame to the widget's content, independent of the height the widget reported, so a
 * screenshot shows the state itself. stability.spec.ts checks that the reported height matches.
 */
export const fitFrameToContent = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const frame = document.querySelector('iframe')
    const root = frame?.contentDocument?.documentElement
    if (!frame || !root) throw new Error('The widget frame is not mounted')
    frame.style.height = '0px'
    frame.style.height = `${root.scrollHeight}px`
  })
}
