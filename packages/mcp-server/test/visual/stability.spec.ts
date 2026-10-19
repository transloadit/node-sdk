import type { FrameLocator, Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import { z } from 'zod'

import { widgetStateFixture } from './fixtures.ts'
import { mountWidget, routeHostAndMedia, settleWidget } from './host.ts'

const fixture = widgetStateFixture('completed-mixed')
const result = fixture.result
const jsonObject = z.record(z.string(), z.unknown())

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
    return (window.mediaBefore ?? []).filter((node) => node.isConnected && now.includes(node))
      .length
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

    expect(await keptMedia(widget.frame)).toBe(media)
    expect(mediaRequests.length).toBe(requestsBefore)
    expect(await sizeChanges(page)).toBe(resizesBefore)
  })

  test('keeps previews when ChatGPT changes theme and maxHeight', async ({ page }) => {
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

    expect(await keptMedia(widget.frame)).toBe(media)
    expect(mediaRequests.length).toBe(requestsBefore)
    // A taller maxHeight may let the capped card grow once; the theme alone changes nothing.
    expect(await sizeChanges(page)).toBeLessThanOrEqual(resizesBefore + 1)
  })

  test('ignores an MCP Apps tool-result that repeats ChatGPT’s toolOutput', async ({ page }) => {
    const mediaRequests = await routeHostAndMedia(page)
    const widget = await mountWidget(page, { fixture, host: 'openai', theme: 'light', width: 760 })
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

    expect(await keptMedia(widget.frame)).toBe(media)
    expect(mediaRequests.length).toBe(requestsBefore)
    expect(await sizeChanges(page)).toBe(resizesBefore)
  })

  test('keeps upload previews when the result moves from executing to completed', async ({
    page,
  }) => {
    const executing = widgetStateFixture('executing').result
    const executingPayload = jsonObject.parse(executing?.structuredContent)
    const completedAssembly = jsonObject.parse(jsonObject.parse(result?.structuredContent).assembly)
    const mediaRequests = await routeHostAndMedia(page)
    const widget = await mountWidget(page, {
      fixture: widgetStateFixture('executing'),
      host: 'mcp',
      theme: 'light',
      width: 760,
    })
    await settleWidget(page, widget.frame)
    const media = await rememberMedia(widget.frame)
    const requestsBefore = mediaRequests.length

    await widget.sendToWidget({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        ...executing,
        structuredContent: {
          ...executingPayload,
          assembly: {
            ...jsonObject.parse(executingPayload.assembly),
            ok: 'ASSEMBLY_COMPLETED',
            results: completedAssembly.results,
          },
        },
      },
    })
    await widget.frame.getByText('Completed').first().waitFor()
    // Next to results, the uploads fold away; opening them shows the same preview node.
    await widget.frame.getByText('Uploaded files').click()
    await settleWidget(page, widget.frame)

    expect(await keptMedia(widget.frame)).toBe(media)
    // Only the new result files are fetched; the upload preview stays as it was.
    expect(mediaRequests.slice(requestsBefore)).not.toContain(mediaRequests[0])
  })

  test('follows a running Assembly to its results through the host bridge', async ({ page }) => {
    const mediaRequests = await routeHostAndMedia(page)
    const refreshed = widgetStateFixture('refreshed-to-completed')
    // Mount on the executing state first: the fixture's own waitForText is the end state.
    const widget = await mountWidget(page, {
      fixture: { ...refreshed, waitForText: 'Processing' },
      host: 'mcp',
      theme: 'light',
      width: 760,
    })
    await settleWidget(page, widget.frame)
    const media = await rememberMedia(widget.frame)
    const requestsBefore = mediaRequests.length
    const resizesBefore = await sizeChanges(page)

    // No new tool result from the host: only the widget's own status checks move it on.
    await widget.frame.getByText('Completed').first().waitFor({ timeout: 20_000 })
    await widget.frame.getByRole('img', { name: 'portrait-800w.png' }).waitFor()
    await widget.frame.getByText('Uploaded files').click()
    await settleWidget(page, widget.frame)

    const statusChecks = (await widget.hostLog()).filter(
      (message) => message.method === 'tools/call',
    )
    expect(statusChecks.map((message) => message.params)).toEqual([
      {
        name: 'transloadit_get_assembly_status',
        arguments: {
          assembly_url: expect.stringMatching(/^https:\/\/api2-sjc\.transloadit\.com\//),
        },
      },
      {
        name: 'transloadit_get_assembly_status',
        arguments: {
          assembly_url: expect.stringMatching(/^https:\/\/api2-sjc\.transloadit\.com\//),
        },
      },
    ])
    // The repeated executing status changed nothing; the upload preview is the same node.
    expect(await keptMedia(widget.frame)).toBe(media)
    expect(mediaRequests.slice(requestsBefore)).not.toContain(mediaRequests[0])
    // Results replace the progress note in one step (plus opening the uploads fold).
    expect(await sizeChanges(page)).toBeLessThanOrEqual(resizesBefore + 2)
  })

  test('reserves preview space, so loading previews do not resize the card', async ({ page }) => {
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
