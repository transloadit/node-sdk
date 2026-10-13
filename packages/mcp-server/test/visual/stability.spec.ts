import type { FrameLocator, Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { widgetStateFixture } from './fixtures.ts'
import { mountWidget, routeHostAndMedia, settleWidget } from './host.ts'

const fixture = widgetStateFixture('completed-mixed')
const result = fixture.result

declare global {
  interface Window {
    mediaBefore?: Element[]
  }
}

/** Remembers the rendered preview elements, so a re-render shows up as different nodes. */
const rememberMedia = async (frame: FrameLocator): Promise<number> =>
  frame.locator('body').evaluate((body) => {
    window.mediaBefore = [...body.querySelectorAll('img, video, audio')]
    return window.mediaBefore.length
  })

/** How many remembered preview elements are still the ones on screen. */
const keptMedia = (frame: FrameLocator): Promise<number> =>
  frame.locator('body').evaluate((body) => {
    const now = [...body.querySelectorAll('img, video, audio')]
    return (window.mediaBefore ?? []).filter(
      (node, index) => node.isConnected && now[index] === node,
    ).length
  })

const sizeChanges = async (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      window.hostLog.filter((entry) => entry.message.method === 'ui/notifications/size-changed')
        .length,
  )

/** Lets a re-render settle: media reloads and ResizeObserver callbacks land within this window. */
const settleAfterHostEvent = async (page: Page, frame: FrameLocator): Promise<void> => {
  await page.waitForTimeout(300)
  await settleWidget(page, frame)
}

test.describe('assembly result widget stability', () => {
  test('keeps previews when the host theme changes over MCP Apps', async ({ page }) => {
    const mediaRequests = await routeHostAndMedia(page)
    const widget = await mountWidget(page, { fixture, host: 'mcp', theme: 'light', width: 760 })
    await settleWidget(page, widget.frame)
    const media = await rememberMedia(widget.frame)
    const requestsBefore = mediaRequests.length
    const resizesBefore = await sizeChanges(page)

    await widget.sendToWidget({
      jsonrpc: '2.0',
      method: 'ui/notifications/host-context-changed',
      params: { theme: 'dark' },
    })
    await settleAfterHostEvent(page, widget.frame)

    expect(await keptMedia(widget.frame)).toBe(media)
    expect(mediaRequests.length).toBe(requestsBefore)
    expect(await sizeChanges(page)).toBe(resizesBefore)
  })

  test('keeps previews when the host repeats the same tool-result', async ({ page }) => {
    // Known failure: render() starts with app.replaceChildren() for every tool-result, so a host
    // that re-delivers the result (reconnects, re-mounts, history replay) rebuilds every preview.
    test.fail()
    const mediaRequests = await routeHostAndMedia(page)
    const widget = await mountWidget(page, { fixture, host: 'mcp', theme: 'light', width: 760 })
    await settleWidget(page, widget.frame)
    const media = await rememberMedia(widget.frame)
    const requestsBefore = mediaRequests.length
    const resizesBefore = await sizeChanges(page)

    await widget.sendToWidget({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: result,
    })
    await settleAfterHostEvent(page, widget.frame)

    expect.soft(mediaRequests.length).toBe(requestsBefore)
    expect.soft(await sizeChanges(page)).toBe(resizesBefore)
    expect(await keptMedia(widget.frame)).toBe(media)
  })

  test('keeps previews when ChatGPT changes theme and maxHeight', async ({ page }) => {
    // Known failure: the openai:set_globals listener calls renderFromOpenAi(), which re-renders
    // from toolOutput on every globals change, even when only theme or maxHeight changed.
    test.fail()
    const mediaRequests = await routeHostAndMedia(page)
    const widget = await mountWidget(page, { fixture, host: 'openai', theme: 'light', width: 760 })
    await settleWidget(page, widget.frame)
    const media = await rememberMedia(widget.frame)
    const requestsBefore = mediaRequests.length
    const resizesBefore = await sizeChanges(page)

    await page.evaluate(() => {
      const widgetWindow = window.widgetWindow()
      const globals = { theme: 'dark', maxHeight: 640 }
      Object.assign(widgetWindow.openai ?? {}, globals)
      widgetWindow.dispatchEvent(
        new widgetWindow.CustomEvent('openai:set_globals', { detail: { globals } }),
      )
    })
    await settleAfterHostEvent(page, widget.frame)

    expect.soft(mediaRequests.length).toBe(requestsBefore)
    expect.soft(await sizeChanges(page)).toBe(resizesBefore)
    expect(await keptMedia(widget.frame)).toBe(media)
  })

  test('reserves preview space, so loading previews do not resize the card', async ({ page }) => {
    // Known failure: previews have no width/height or aspect-ratio box. The card first renders
    // with the 72px min-height placeholders, then grows as each image loads, and a video is 300x150
    // until its metadata arrives, so the host resizes the frame several times after the result.
    test.fail()
    // Result files arrive over the network after the result itself, as they do in a real chat.
    await routeHostAndMedia(page, { latencyMs: 250 })
    const widget = await mountWidget(page, {
      fixture: widgetStateFixture('running'),
      host: 'mcp',
      theme: 'light',
      width: 760,
    })
    await settleWidget(page, widget.frame)
    const resizesBeforeResult = await sizeChanges(page)

    await widget.sendToWidget({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: result,
    })
    await widget.frame.getByText(fixture.waitForText).waitFor()
    await settleWidget(page, widget.frame)

    // One height for the rendered result is expected; every further one is a visible jump.
    const heights = (await widget.hostLog())
      .filter((message) => message.method === 'ui/notifications/size-changed')
      .slice(resizesBeforeResult)
      .map((message) => JSON.stringify(message.params))
    expect(new Set(heights).size).toBe(1)
  })

  test('reports its content height when the host starts with a taller frame', async ({ page }) => {
    // Known failure: size-changed carries documentElement.scrollHeight, which is never smaller
    // than the frame itself. A host that starts with a placeholder height (or a preview that is
    // briefly taller while loading) leaves the frame too tall, with empty space below the content.
    test.fail()
    await routeHostAndMedia(page)
    const widget = await mountWidget(page, {
      fixture: widgetStateFixture('waiting'),
      host: 'mcp',
      theme: 'light',
      width: 760,
      initialHeight: 400,
    })
    await settleWidget(page, widget.frame)

    const contentHeight = await widget.frame
      .locator('body')
      .evaluate((body) => Math.ceil(body.getBoundingClientRect().height))
    const heights = (await widget.hostLog())
      .filter((message) => message.method === 'ui/notifications/size-changed')
      .map((message) => JSON.stringify(message.params))
    expect(heights.at(-1)).toBe(JSON.stringify({ width: 760, height: contentHeight }))
  })
})
