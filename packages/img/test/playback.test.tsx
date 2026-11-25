// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'

import type { PlaybackSource } from '../src/useMediaPlayback.ts'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useMediaPlayback, Viewer } from '../src/viewer.tsx'

let root: Root
let container: HTMLDivElement
const source: PlaybackSource = {
  asset_id: 'asset',
  version_id: 'version',
  mediaUrl: 'https://cdn.invalid/original?sig=first',
  mediaFormat: 'mp4',
  expiresAt: 1,
}

function Movie({ refresh }: { refresh: () => Promise<PlaybackSource | undefined> }): ReactNode {
  const playback = useMediaPlayback<HTMLVideoElement>(source, refresh)
  return (
    <>
      <Viewer kind="video" ref={playback.media} {...playback.events} aria-label="Movie" />
      <button type="button" onClick={playback.play}>
        Play
      </button>
      {playback.failed ? <p role="alert">Unavailable</p> : null}
    </>
  )
}

beforeEach(() => {
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
