// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'

import type { PlaybackSource } from '../src/useMediaPlayback.ts'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useMediaPlayback, Viewer } from '../src/viewer.tsx'

const hls = vi.hoisted(() => ({
  supported: true,
  load: vi.fn(),
  destroy: vi.fn(),
  transfer: vi.fn(),
  attach: vi.fn(),
  configs: [] as unknown[],
  handlers: new Map<
    string,
    (event: string, data: { fatal: boolean; type: string; response?: { code: number } }) => void
  >(),
}))

vi.mock('hls.js', () => ({
  default: class {
    static Events = { ERROR: 'error', MANIFEST_PARSED: 'manifest' }
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' }
    static ErrorDetails = {
      BUFFER_STALLED_ERROR: 'bufferStalledError',
      BUFFER_NUDGE_ON_STALL: 'bufferNudgeOnStall',
      BUFFER_SEEK_OVER_HOLE: 'bufferSeekOverHole',
      BUFFER_FULL_ERROR: 'bufferFullError',
    }
    static isSupported() {
      return hls.supported
    }
    constructor(config: unknown) {
      hls.configs.push(config)
    }
    currentLevel = 2
    bandwidthEstimate = 4_500_000
    on(
      event: string,
      callback: (
        event: string,
        data: { fatal: boolean; type: string; response?: { code: number } },
      ) => void,
    ) {
      hls.handlers.set(event, callback)
    }
    attachMedia = hls.attach
    transferMedia = hls.transfer
    loadSource = hls.load
    destroy = hls.destroy
  },
}))

let root: Root
let container: HTMLDivElement
const source: PlaybackSource = {
  asset_id: 'asset',
  version_id: 'version',
  mediaUrl: 'https://cdn.invalid/original?sig=first',
  mediaFormat: 'mp4',
  expiresAt: 1,
}

function Movie({
  refresh,
  details = source,
  onPlaybackChange,
}: {
  refresh: () => Promise<PlaybackSource | undefined>
  details?: PlaybackSource
  onPlaybackChange?: (playing: boolean) => void
}): ReactNode {
  const playback = useMediaPlayback<HTMLVideoElement>(details, refresh, onPlaybackChange)
  return (
    <>
      <Viewer kind="video" ref={playback.media} {...playback.events} aria-label="Movie" />
      <button type="button" onClick={playback.play}>
        Play
      </button>
      <button type="button" onClick={playback.prepare}>
        Prepare
      </button>
      {playback.failed ? <p role="alert">Unavailable</p> : null}
    </>
  )
}

beforeEach(() => {
  hls.supported = true
  hls.handlers.clear()
  hls.load.mockClear()
  hls.destroy.mockClear()
  hls.transfer.mockReset()
  hls.attach.mockClear()
  hls.configs.length = 0
  Object.defineProperties(HTMLMediaElement, {
    HAVE_CURRENT_DATA: { configurable: true, value: 2 },
    HAVE_FUTURE_DATA: { configurable: true, value: 3 },
  })
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('MediaError', { MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2 })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function play(refresh: () => Promise<PlaybackSource | undefined>): Promise<HTMLVideoElement> {
  await act(() => root.render(<Movie refresh={refresh} />))
  const video = container.querySelector('video')
  const button = container.querySelector('button')
  if (!video || !button) throw new Error('Missing player')
  expect(video.getAttribute('src')).toBeNull()
  expect(refresh).not.toHaveBeenCalled()
  await act(() => button.click())
  expect(video.src).toBe(source.mediaUrl)
  video.currentTime = 42
  Object.defineProperty(video, 'error', { configurable: true, value: { code: 2 } })
  return video
}

test('renews the same asset version and resumes at the current position', async () => {
  const fresh = {
    ...source,
    mediaUrl: 'https://cdn.invalid/original?sig=renewed',
    expiresAt: Date.now() + 600_000,
  }
  const refresh = vi.fn().mockResolvedValue(fresh)
  const video = await play(refresh)
  await act(async () => {
    video.dispatchEvent(new Event('error'))
    await Promise.resolve()
  })
  expect(refresh).toHaveBeenCalledOnce()
  expect(video.src).toBe(fresh.mediaUrl)
  expect(video.currentTime).toBe(42)
  expect(container.querySelector('[role="alert"]')).toBeNull()
})

test('refuses a changed version instead of switching to unauthorized replacement bytes', async () => {
  const refresh = vi.fn().mockResolvedValue({
    ...source,
    version_id: 'replacement',
    mediaUrl: 'https://cdn.invalid/replacement',
    expiresAt: Date.now() + 600_000,
  })
  const video = await play(refresh)
  await act(async () => {
    video.dispatchEvent(new Event('error'))
    await Promise.resolve()
  })
  expect(refresh).toHaveBeenCalledOnce()
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(video.src).not.toContain('replacement')
})

test('closing during renewal never starts a detached player', async () => {
  let complete: (value: PlaybackSource) => void = () => {
    throw new Error('Renewal not started')
  }
  const promise = new Promise<PlaybackSource>((resolve) => {
    complete = resolve
  })
  const renewal = { promise, resolve: (value: PlaybackSource) => complete(value) }
  const refresh = vi.fn(() => renewal.promise)
  const video = await play(refresh)
  await act(async () => {
    video.dispatchEvent(new Event('error'))
    await Promise.resolve()
  })
  await act(() => root.render(null))
  const played = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
  await act(async () => {
    renewal.resolve({
      ...source,
      mediaUrl: 'https://cdn.invalid/late',
      expiresAt: Date.now() + 600_000,
    })
    await Promise.resolve()
  })
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(played)
  expect(video.getAttribute('src')).toBeNull()
})

function stream(): PlaybackSource {
  return {
    ...source,
    mediaFormat: 'hls',
    fallbackUrl: 'https://cdn.invalid/fallback.mp4',
    expiresAt: Date.now() + 120_000,
  }
}

async function playStream(details = stream(), refresh = vi.fn()): Promise<HTMLVideoElement> {
  await act(() => root.render(<Movie details={details} refresh={refresh} />))
  const video = container.querySelector('video')
  const button = container.querySelector('button')
  if (!video || !button) throw new Error('Missing player')
  expect(hls.load).not.toHaveBeenCalled()
  await act(() => button.click())
  await vi.waitFor(() => expect(hls.load).toHaveBeenCalledWith(details.mediaUrl))
  return video
}

test('attaches HLS on demand and destroys it on close', async () => {
  const video = await playStream()
  expect(hls.attach).toHaveBeenCalledWith(video)
  await act(() => hls.handlers.get('manifest')?.('manifest', { fatal: false, type: 'manifest' }))
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  await act(() => root.render(null))
  expect(hls.destroy).toHaveBeenCalledOnce()
  expect(video.getAttribute('src')).toBeNull()
})

test('falls back to MP4 after a fatal decoder failure at the current position', async () => {
  const details = stream()
  const video = await playStream(details)
  video.currentTime = 42
  await act(() => hls.handlers.get('error')?.('error', { fatal: true, type: 'media' }))
  expect(video.src).toBe(details.fallbackUrl)
  expect(video.currentTime).toBe(42)
  expect(hls.destroy).toHaveBeenCalledOnce()
})

test('renews a 403 grant while transferring buffered media and ABR state', async () => {
  const details = stream()
  const fresh = {
    ...details,
    mediaUrl: 'https://cdn.invalid/renewed',
    expiresAt: Date.now() + 600_000,
  }
  const refresh = vi.fn().mockResolvedValue(fresh)
  const video = await playStream(details, refresh)
  video.currentTime = 42
  Object.defineProperty(video, 'readyState', { configurable: true, value: 4 })
  const transferred = { media: video, mediaSource: null, tracks: {} }
  hls.transfer.mockReturnValue(transferred)
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  await act(() =>
    hls.handlers.get('error')?.('error', { fatal: true, type: 'network', response: { code: 403 } }),
  )
  await vi.waitFor(() => expect(hls.load).toHaveBeenLastCalledWith(fresh.mediaUrl))
  expect(refresh).toHaveBeenCalledOnce()
  expect(fetchMock).not.toHaveBeenCalled()
  expect(hls.attach).toHaveBeenLastCalledWith(transferred)
  expect(hls.configs.at(-1)).toMatchObject({
    startLevel: 2,
    abrEwmaDefaultEstimate: 4_500_000,
    startPosition: 42,
  })
})

test('aborts a fallback warmup and destroys the retry on close', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  const video = await playStream()
  await act(() =>
    hls.handlers.get('error')?.('error', { fatal: true, type: 'network', response: { code: 503 } }),
  )
  await vi.waitFor(() => expect(hls.load).toHaveBeenCalledTimes(2))
  expect(fetchMock).toHaveBeenCalledWith(
    'https://cdn.invalid/fallback.mp4',
    expect.objectContaining({ method: 'HEAD', mode: 'no-cors' }),
  )
  const signal = fetchMock.mock.calls[0]?.[1]?.signal
  expect(signal?.aborted).toBe(false)
  await act(() => root.render(null))
  expect(signal?.aborted).toBe(true)
  expect(hls.destroy).toHaveBeenCalledTimes(2)
  expect(video.getAttribute('src')).toBeNull()
})

test('uses the prepared MP4 instead of encoding the fallback again', async () => {
  const details = stream()
  const refresh = vi.fn()
  const video = await playStream(details, refresh)
  video.currentTime = 42
  const prepared = {
    ...details,
    fallbackUrl: undefined,
    mediaFormat: 'mp4',
    mediaUrl: 'https://cdn.invalid/prepared.mp4',
  } satisfies PlaybackSource
  await act(() => root.render(<Movie details={prepared} refresh={refresh} />))
  await act(() => hls.handlers.get('error')?.('error', { fatal: true, type: 'media' }))
  expect(video.src).toBe(prepared.mediaUrl)
  expect(video.currentTime).toBe(42)
  expect(refresh).not.toHaveBeenCalled()
})

test('rejects an HLS renewal for a different version', async () => {
  const details = stream()
  const refresh = vi
    .fn()
    .mockResolvedValue({ ...details, version_id: 'other', mediaUrl: 'https://cdn.invalid/other' })
  await playStream(details, refresh)
  await act(() =>
    hls.handlers.get('error')?.('error', { fatal: true, type: 'network', response: { code: 403 } }),
  )
  await vi.waitFor(() =>
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable'),
  )
  expect(hls.load).toHaveBeenCalledTimes(1)
})

test('prepares idle native controls through the MP4 fallback without requesting HLS', async () => {
  const details = stream()
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  await act(() => root.render(<Movie details={details} refresh={vi.fn()} />))
  const button = container.querySelectorAll('button')[1]
  const video = container.querySelector('video')
  if (!button || !video) throw new Error('Missing player')
  await act(() => button.click())
  expect(video.src).toBe(details.fallbackUrl)
  expect(video.preload).toBe('none')
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
  expect(hls.load).not.toHaveBeenCalled()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('a retry after failure still cleans up its HLS instance on unmount', async () => {
  const details = { ...stream(), fallbackUrl: undefined }
  await playStream(details)
  await act(() => hls.handlers.get('error')?.('error', { fatal: true, type: 'media' }))
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(hls.destroy).toHaveBeenCalledOnce()
  const button = container.querySelector('button')
  if (!button) throw new Error('Missing retry control')
  await act(() => button.click())
  await vi.waitFor(() => expect(hls.load).toHaveBeenCalledTimes(2))
  expect(container.querySelector('[role="alert"]')).toBeNull()
  await act(() => root.render(null))
  expect(hls.destroy).toHaveBeenCalledTimes(2)
})

test('HLS recovery uses the latest refresh callback after rerendering', async () => {
  const details = stream()
  const originalRefresh = vi.fn().mockResolvedValue(undefined)
  await playStream(details, originalRefresh)
  const fresh = { ...details, mediaUrl: 'https://cdn.invalid/renewed' }
  const refresh = vi.fn().mockResolvedValue(fresh)
  await act(() => root.render(<Movie details={details} refresh={refresh} />))
  await act(() =>
    hls.handlers.get('error')?.('error', { fatal: true, type: 'network', response: { code: 403 } }),
  )
  expect(refresh).toHaveBeenCalledOnce()
  expect(originalRefresh).not.toHaveBeenCalled()
  expect(hls.load).toHaveBeenLastCalledWith(fresh.mediaUrl)
})

test('HLS failures notify the latest playback callback', async () => {
  const details = { ...stream(), fallbackUrl: undefined }
  const refresh = vi.fn()
  const originalCallback = vi.fn()
  await act(() =>
    root.render(<Movie details={details} refresh={refresh} onPlaybackChange={originalCallback} />),
  )
  const button = container.querySelector('button')
  if (!button) throw new Error('Missing play control')
  await act(() => button.click())
  const onPlaybackChange = vi.fn()
  await act(() =>
    root.render(<Movie details={details} refresh={refresh} onPlaybackChange={onPlaybackChange} />),
  )
  await act(() => hls.handlers.get('error')?.('error', { fatal: true, type: 'media' }))
  expect(onPlaybackChange).toHaveBeenCalledWith(false)
  expect(originalCallback).not.toHaveBeenCalled()
})

test('a pending renewal cannot suppress recovery or clear a newer renewal', async () => {
  const completions: ((value: PlaybackSource) => void)[] = []
  const refresh = vi.fn(
    () =>
      new Promise<PlaybackSource>((resolve) => {
        completions.push(resolve)
      }),
  )
  const video = await play(refresh)
  await act(() => video.dispatchEvent(new Event('error')))
  const button = container.querySelector('button')
  if (!button) throw new Error('Missing retry control')
  await act(() => button.click())
  await act(() => video.dispatchEvent(new Event('error')))
  expect(refresh).toHaveBeenCalledTimes(2)
  const first = completions[0]
  const second = completions[1]
  if (!first || !second) throw new Error('Missing pending renewals')
  const fresh = {
    ...source,
    mediaUrl: 'https://cdn.invalid/renewed',
    expiresAt: Date.now() + 60_000,
  }
  await act(() => first(fresh))
  await act(() => video.dispatchEvent(new Event('error')))
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(refresh).toHaveBeenCalledTimes(2)
  await act(() => second(fresh))
  expect(video.src).toBe(fresh.mediaUrl)
})

test.each(['Play', 'Prepare'])('%s reports failure without a primary media URL', async (action) => {
  const details = { ...stream(), mediaUrl: undefined }
  const refresh = vi.fn()
  await act(() => root.render(<Movie details={details} refresh={refresh} />))
  const button = Array.from(container.querySelectorAll('button')).find(
    (element) => element.textContent === action,
  )
  if (!button) throw new Error('Missing playback control')
  await act(() => button.click())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(container.querySelector('video')?.getAttribute('src')).toBeNull()
  expect(refresh).not.toHaveBeenCalled()
  expect(hls.load).not.toHaveBeenCalled()
})

test('preparing non-native HLS without a fallback fails without requesting media', async () => {
  const details = { ...stream(), fallbackUrl: undefined }
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  await act(() => root.render(<Movie details={details} refresh={vi.fn()} />))
  const button = container.querySelectorAll('button')[1]
  if (!button) throw new Error('Missing preparation control')
  await act(() => button.click())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(container.querySelector('video')?.getAttribute('src')).toBeNull()
  expect(hls.load).not.toHaveBeenCalled()
  expect(fetchMock).not.toHaveBeenCalled()
})
