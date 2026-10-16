// @vitest-environment happy-dom
import type { Root } from 'react-dom/client'

import { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { Video } from '../src/video.tsx'

const src = {
  workspace: 'wedding',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'movie.mp4',
}
let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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
async function mount() {
  await act(() => root.render(<Video src={src} aria-label="First dance" />))
  const video = container.querySelector('video')
  if (!video) throw new Error('Missing video')
  const media: { currentTime: number; paused: boolean; error: { code: number } | null } = {
    currentTime: 0,
    paused: true,
    error: null,
  }
  for (const name of ['currentTime', 'paused', 'error'] as const)
    Object.defineProperty(video, name, {
      configurable: true,
      get: () => media[name],
      set: (value) => Object.assign(media, { [name]: value }),
    })
  const load = vi.spyOn(video, 'load').mockImplementation(() => {
    Object.assign(media, { currentTime: 0, paused: true, error: null })
    video.playbackRate = video.defaultPlaybackRate
  })
  const play = vi.spyOn(video, 'play').mockImplementation(() => {
    media.paused = false
    return Promise.resolve()
  })
  const emit = (name: string) => video.dispatchEvent(new Event(name))
  const fail = (code = 2) => {
    media.error = { code }
    emit('error')
    media.paused = true
    emit('pause')
  }
  return { video, media, load, play, emit, fail }
}

test('SSR exposes only authorized-route selectors and forwards native video attributes', () => {
  const html = renderToString(
    <Video
      src={src}
      poster={{ ...src, asset_id: 'C'.repeat(21) + 'A' }}
      route="/media"
      aria-label="First dance"
      preload="none"
      muted
    />,
  )
  expect(html).toContain('src="/media?asset_id=')
  expect(html).toContain('poster="/media?asset_id=')
  expect(html).toContain('action=original')
  expect(html).toContain('preload="none"')
  expect(html).toContain('aria-label="First dance"')
  expect(html).not.toContain('movie.mp4')
  expect(() => renderToString(<Video src={src} route="https://outside.test" />)).toThrow(
    'same-origin',
  )
})

test.each([
  true,
  false,
])('restores position and playback intent playing=%s through the same URL', async (playing) => {
  const { video, media, load, play, emit, fail } = await mount()
  const href = video.getAttribute('src')
  emit('loadedmetadata')
  media.currentTime = 42
  if (playing) {
    media.paused = false
    emit('play')
  }
  fail()
  expect(load).toHaveBeenCalledOnce()
  expect(video.getAttribute('src')).toBe(href)
  emit('loadedmetadata')
  expect(media.currentTime).toBe(42)
  emit('seeked')
  expect(play).toHaveBeenCalledTimes(playing ? 1 : 0)
  media.currentTime = 93
  fail()
  expect(load).toHaveBeenCalledTimes(2)
})

test('restores playing at zero without waiting for a nonexistent seeked event', async () => {
  const { media, play, emit, fail } = await mount()
  emit('loadedmetadata')
  media.paused = false
  emit('play')
  fail()
  emit('loadedmetadata')
  expect(play).not.toHaveBeenCalled()
  emit('loadeddata')
  expect(play).toHaveBeenCalledOnce()
})

test('initial, decode and refused renewal errors do not loop or restore a later source', async () => {
  const { media, load, play, emit, fail } = await mount()
  fail()
  expect(load).not.toHaveBeenCalled()
  emit('loadedmetadata')
  fail(3)
  expect(load).not.toHaveBeenCalled()
  media.currentTime = 42
  fail()
  expect(load).toHaveBeenCalledOnce()
  fail(4)
  fail()
  expect(load).toHaveBeenCalledOnce()
  emit('loadedmetadata')
  emit('seeked')
  expect(media.currentTime).toBe(0)
  expect(play).not.toHaveBeenCalled()
})

test('hydration after metadata does not rearm a failed renewal at metadata alone', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(1)
  const { media, load, emit, fail } = await mount()
  media.currentTime = 42
  fail()
  expect(load).toHaveBeenCalledOnce()
  emit('loadedmetadata')
  fail()
  expect(load).toHaveBeenCalledOnce()
})

test('ordinary rerenders preserve recovery; another exact version gets a clean element', async () => {
  const { video, media, load, emit, fail } = await mount()
  emit('loadedmetadata')
  await act(() => root.render(<Video src={{ ...src }} aria-label="Renamed" />))
  expect(container.querySelector('video')).toBe(video)
  media.currentTime = 14
  fail()
  expect(load).toHaveBeenCalledOnce()
  await act(() => root.render(<Video src={{ ...src, version_id: 'C'.repeat(21) + 'A' }} />))
  expect(container.querySelector('video')).not.toBe(video)
  emit('loadedmetadata')
  emit('seeked')
  expect(media.currentTime).toBe(0)
})

test('supports native object and callback refs with cleanup', async () => {
  const ref = createRef<HTMLVideoElement>()
  await act(() => root.render(<Video src={src} ref={ref} />))
  expect(ref.current).toBe(container.querySelector('video'))
  const cleanup = vi.fn()
  const attach = vi.fn(() => cleanup)
  await act(() => root.render(<Video src={src} ref={attach} />))
  expect(ref.current).toBeNull()
  expect(attach).toHaveBeenCalledOnce()
  await act(() => root.render(null))
  expect(cleanup).toHaveBeenCalledOnce()
})

test('changing a forwarded callback ref does not interrupt an in-flight restoration', async () => {
  const { media, emit, fail, play } = await mount()
  const firstCleanup = vi.fn()
  await act(() => root.render(<Video src={src} ref={() => firstCleanup} />))
  emit('loadedmetadata')
  media.currentTime = 42
  media.paused = false
  emit('play')
  fail()
  const nextCleanup = vi.fn()
  await act(() => root.render(<Video src={src} ref={() => nextCleanup} />))
  expect(firstCleanup).toHaveBeenCalledOnce()
  emit('loadedmetadata')
  expect(media.currentTime).toBe(42)
  emit('seeked')
  expect(play).toHaveBeenCalledOnce()
  await act(() => root.render(null))
  expect(nextCleanup).toHaveBeenCalledOnce()
})

test.each(['none', 'metadata'])('loads restoration data even with preload=%s', async (preload) => {
  const { video, load, emit, fail } = await mount()
  await act(() => root.render(<Video src={src} preload={preload} />))
  emit('loadedmetadata')
  fail()
  expect(load).toHaveBeenCalledOnce()
  expect(video.preload).toBe('auto')
  emit('loadedmetadata')
  emit('loadeddata')
  expect(video.preload).toBe(preload)
  fail()
  expect(video.preload).toBe('auto')
  fail(4)
  expect(video.preload).toBe(preload)
  expect(load).toHaveBeenCalledTimes(2)
})

test('keeps a user-paused autoplay video paused and preserves playback speed', async () => {
  const { video, media, play, emit, fail } = await mount()
  await act(() => root.render(<Video src={src} autoPlay muted />))
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => {
    media.paused = true
  })
  emit('loadedmetadata')
  video.playbackRate = 2
  media.currentTime = 42
  fail()
  expect(video.autoplay).toBe(false)
  emit('loadedmetadata')
  expect(video.playbackRate).toBe(2)
  emit('seeked')
  expect(pause).toHaveBeenCalledOnce()
  expect(play).not.toHaveBeenCalled()
  expect(video.autoplay).toBe(true)
})

test('does not retain playing intent after an autoplay-policy rejection', async () => {
  const { media, play, emit } = await mount()
  play.mockRejectedValue(new DOMException('User gesture required', 'NotAllowedError'))
  emit('loadedmetadata')
  media.currentTime = 42
  media.paused = false
  emit('play')
  // Native load() sets paused without emitting a pause event.
  media.error = { code: 2 }
  emit('error')
  emit('loadedmetadata')
  emit('seeked')
  await Promise.resolve()
  expect(play).toHaveBeenCalledOnce()
  media.error = { code: 2 }
  emit('error')
  emit('loadedmetadata')
  emit('seeked')
  expect(play).toHaveBeenCalledOnce()
})

test('an explicit caller reload cancels restoration and rearms only after usable data', async () => {
  const { video, media, load, emit, fail } = await mount()
  emit('loadedmetadata')
  media.currentTime = 42
  fail()
  emit('loadedmetadata')
  video.load()
  emit('emptied')
  expect(video.preload).toBe('metadata')
  emit('loadedmetadata')
  expect(media.currentTime).toBe(0)
  emit('loadeddata')
  fail()
  expect(load).toHaveBeenCalledTimes(3)
})

test('an explicit default route preserves the same playing element', async () => {
  const { video } = await mount()
  await act(() => root.render(<Video src={src} route="/api/transloadit/media" />))
  expect(container.querySelector('video')).toBe(video)
})

test('a caller reload outside renewal clears the previous playback intent', async () => {
  const { video, media, play, emit } = await mount()
  emit('loadedmetadata')
  media.paused = false
  emit('play')
  video.load()
  emit('emptied')
  emit('loadedmetadata')
  media.error = { code: 2 }
  emit('error')
  emit('loadedmetadata')
  emit('loadeddata')
  expect(play).not.toHaveBeenCalled()
})
