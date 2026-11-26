'use client'

import type Hls from 'hls.js'
import type { LoadPolicy } from 'hls.js'
import type { RefObject } from 'react'

import { useEffect, useRef, useState } from 'react'

/** Version-bound signed sources, including on-the-fly streams with an encoded MP4 fallback. */
export interface PlaybackSource {
  /** Asset identity that every refreshed grant must preserve. */
  asset_id: string
  /** Retained version identity that every refreshed grant must preserve. */
  version_id: string
  /** Authorized primary media URL; play and prepare report failure when it is absent. */
  mediaUrl?: string
  /** HLS uses native playback or hls.js for video; MP4 and omission use native playback. */
  mediaFormat?: 'hls' | 'mp4'
  /**
   * Authorized MP4 alternative. Serious HLS errors may send a background HEAD before use.
   * A fresh MP4 source without this field signals that background preparation has finished.
   */
  fallbackUrl?: string
  /**
   * Epoch milliseconds compared with browser Date.now(), with a 5-second expiry margin.
   * Derive from client receipt time plus the grant's remaining lifetime to avoid clock skew.
   */
  expiresAt: number
}

const EXPIRY_MARGIN_MS = 5_000

/**
 * A fresh answer that replaces on-the-fly playback (which always offers an MP4 fallback) with the
 * prepared MP4 once background preparation finished.
 */
function becamePrepared(playing: { fallbackUrl?: string }, fresh: PlaybackSource): boolean {
  return (
    playing.fallbackUrl !== undefined &&
    fresh.fallbackUrl === undefined &&
    fresh.mediaFormat === 'mp4' &&
    fresh.mediaUrl !== undefined
  )
}

// Cold VOD requests may need to probe and encode a source before returning any bytes.
// Hls retries the same signed URL so a transient timeout still reuses the generated result.
const VOD_LOAD_POLICY: LoadPolicy = {
  default: {
    maxTimeToFirstByteMs: 120_000,
    maxLoadTimeMs: 180_000,
    timeoutRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
    errorRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
  },
}

export interface MediaPlayback<T extends HTMLMediaElement> {
  media: RefObject<T | null>
  /** True after play() starts an attempt; prepare() and native playback do not set it. */
  started: boolean
  failed: boolean
  loading: boolean
  play: () => void
  /** Prepares native controls without autoplay; non-native HLS uses the MP4 fallback. */
  prepare: () => void
  events: {
    onCanPlay: () => void
    onError: () => void
    onLoadedData: () => void
    onEnded: () => void
    onPause: () => void
    onPlay: () => void
    onPlaying: () => void
    onWaiting: () => void
  }
}

/**
 * Play on click for a `<video>` or `<audio>` that React never gives a `src`, so nothing loads
 * before play() or prepare(). Within an attempt, error recovery re-signs at most once until the
 * element plays again; fallback may separately refresh an expired grant. Renewal keeps position
 * but may rebuffer. New sources renew buffered, playing HLS with a fallback within 60 seconds
 * of expiry; a fresh MP4 without a fallback replaces it.
 * Serious HLS errors may HEAD the fallback URL; fallback waits for that request without a timeout.
 */
export function useMediaPlayback<T extends HTMLMediaElement>(
  details: PlaybackSource,
  refresh: () => Promise<PlaybackSource | undefined>,
  onPlaybackChange?: (playing: boolean) => void,
): MediaPlayback<T> {
  const media = useRef<T>(null)
  const callbacks = useRef({ refresh, onPlaybackChange })
  useEffect(() => {
    callbacks.current = { refresh, onPlaybackChange }
  }, [refresh, onPlaybackChange])
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const hls = useRef<Hls | null>(null)
  const startupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const loadingId = useRef(0)
  // The MP4 fallback is encoded on its first request, which takes minutes for a long video. A
  // background request starts that encode at the stream's first serious error, while hls.js
  // still tries.
  const warmUp = useRef<{ done: Promise<void>; controller: AbortController } | null>(null)
  const loadedElement = useRef<T | null>(null)
  function teardown(): void {
    loadingId.current += 1
    clearTimeout(startupTimer.current)
    // Nobody is left to watch: cancelling the request also cancels its encode.
    warmUp.current?.controller.abort()
    warmUp.current = null
    hls.current?.destroy()
    hls.current = null
    // A detached native HLS player can keep requesting billable segments after closing.
    loadedElement.current?.pause()
    loadedElement.current?.removeAttribute('src')
    loadedElement.current?.load()
    loadedElement.current = null
  }
  const release = useRef(teardown)
  useEffect(() => () => release.current(), [])
  useEffect(() => {
    if (failed) release.current()
  }, [failed])
  // The current link and its deadline on the same clock as Date.now().
  const source = useRef<{
    url: string
    expiresAt: number
    assetId: string
    versionId: string
    format: 'hls' | 'mp4' | 'original'
    fallbackUrl?: string
  } | null>(null)
  // One re-sign until the element plays again, so a long video can re-sign once per grant.
  const resigned = useRef(false)
  const retried = useRef(false)
  const wasPlaying = useRef(false)
  const awaitingPlayback = useRef(false)
  const fallbackUsed = useRef(false)
  // Set once the browser's own HLS player failed on this stream; hls.js plays it from then on.
  const nativeHlsFailed = useRef(false)
  const refreshing = useRef<number | null>(null)
  // The newest answer, so a failing on-the-fly stream can use a prepared MP4 polled meanwhile.
  const latest = useRef(details)
  useEffect(() => {
    latest.current = details
  }, [details])
  function fail(): void {
    setLoading(false)
    setFailed(true)
    callbacks.current.onPlaybackChange?.(false)
  }
  useEffect(() => {
    // A hidden <audio> cannot take focus inside the click itself.
    if (started) media.current?.focus()
  }, [started])

  async function load(
    element: T,
    url: string,
    time = 0,
    autoplay = true,
    format = source.current?.format,
    preserveBuffer = false,
  ): Promise<void> {
    loadedElement.current = element
    const id = ++loadingId.current
    clearTimeout(startupTimer.current)
    awaitingPlayback.current = autoplay
    const native =
      format !== 'hls' ||
      (!nativeHlsFailed.current && element.canPlayType('application/vnd.apple.mpegurl') !== '')
    // Native controls cannot start a JavaScript-only stream without loading its manifest. Use
    // the authorized MP4 under preload="none"; callers wanting HLS use the explicit play action.
    if (!autoplay && !native) {
      await fallback(element)
      return
    }
    // Load hls.js before letting go of the current player, so a newer load during the import
    // leaves this one playing instead of detached. Native playback stays synchronous, inside
    // Safari's user activation.
    const HlsPlayer = native ? null : (await import('hls.js')).default
    if (id !== loadingId.current || media.current !== element) return
    const previous = hls.current
    // A first-manifest failure has no buffered playback to preserve and still needs play().
    const transferred =
      preserveBuffer && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ? previous?.transferMedia()
        : null
    // A renewed grant keeps its rendition and bandwidth estimate instead of restarting ABR.
    const bandwidth = previous?.bandwidthEstimate
    const carried =
      transferred && previous
        ? {
            startLevel: previous.currentLevel,
            ...(bandwidth !== undefined && Number.isFinite(bandwidth) && bandwidth > 0
              ? { abrEwmaDefaultEstimate: bandwidth }
              : {}),
          }
        : {}
    previous?.destroy()
    hls.current = null
    setLoading(!transferred || element.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)
    if (HlsPlayer === null) {
      element.src = url
      element.currentTime = time
      // preload="none" leaves a paused native player idle until its next user activation.
      if (!autoplay) setLoading(false)
      if (autoplay) void element.play().catch(() => setLoading(false))
      if (autoplay && format === 'hls' && source.current?.fallbackUrl) {
        // Native HLS can stall indefinitely without an error on an unsupported playlist.
        startupTimer.current = setTimeout(() => {
          if (id === loadingId.current) void fallback(element)
        }, 120_000)
      }
      return
    }
    if (!(element instanceof HTMLVideoElement) || !HlsPlayer.isSupported()) {
      await fallback(element)
      return
    }
    const player = new HlsPlayer({
      ...carried,
      startPosition: time,
      manifestLoadPolicy: VOD_LOAD_POLICY,
      playlistLoadPolicy: VOD_LOAD_POLICY,
      fragLoadPolicy: VOD_LOAD_POLICY,
    })
    hls.current = player
    // A slow or seeking playback reports these and recovers; they are not worth an encode.
    const routine = new Set<string>([
      HlsPlayer.ErrorDetails.BUFFER_STALLED_ERROR,
      HlsPlayer.ErrorDetails.BUFFER_NUDGE_ON_STALL,
      HlsPlayer.ErrorDetails.BUFFER_SEEK_OVER_HOLE,
      HlsPlayer.ErrorDetails.BUFFER_FULL_ERROR,
    ])
    player.on(HlsPlayer.Events.ERROR, (_event, data) => {
      if (hls.current !== player) return
      if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR) {
        if (!data.fatal) return
        // Downloads that failed through hls.js's own retries get one more try, then the MP4. A
        // 401 or 403 is the grant both links share expiring, which re-signs instead.
        const status = data.response?.code
        if (status !== 401 && status !== 403) warmFallback()
        void recover(true, status)
        return
      }
      if (data.fatal) {
        // The MP4 loads right away: there is nothing to start early.
        void fallback(element)
        return
      }
      // Media hls.js could not append or parse is serious, unlike a stall it recovers from.
      if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR && !routine.has(data.details)) {
        warmFallback()
      }
    })
    player.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
      if (autoplay && awaitingPlayback.current && element.paused && hls.current === player) {
        void element.play().catch(() => setLoading(false))
      }
    })
    player.attachMedia(transferred ?? element)
    player.loadSource(url)
  }

  /**
   * Requests the MP4 fallback once, without downloading it, so its encode runs before it is
   * needed. HEAD runs the whole encode, and api2 keeps the result for this version whatever the
   * signature, so the fallback's own request, even re-signed, skips the encode. The request is
   * left to finish: an aborted one cancels its encode.
   */
  function warmFallback(): void {
    const playing = source.current
    if (
      // The prepared MP4 replaces the fallback, so encoding it on the fly would be wasted.
      (playing && becamePrepared(playing, latest.current)) ||
      warmUp.current ||
      fallbackUsed.current ||
      !playing?.fallbackUrl ||
      Date.now() >= playing.expiresAt - EXPIRY_MARGIN_MS
    )
      return
    const controller = new AbortController()
    const done = fetch(playing.fallbackUrl, {
      method: 'HEAD',
      // The answer is not read, only waited for; no CORS needed.
      mode: 'no-cors',
      signal: controller.signal,
    }).then(
      () => undefined,
      () => undefined,
    )
    warmUp.current = { done, controller }
  }

  /** Moves on-the-fly playback to the prepared MP4 when `fresh` offers it; false otherwise. */
  async function playPrepared(
    element: T,
    playing: NonNullable<typeof source.current>,
    fresh: PlaybackSource | undefined,
    resume: { time: number; play: boolean },
  ): Promise<boolean> {
    if (
      fresh?.mediaUrl === undefined ||
      !becamePrepared(playing, fresh) ||
      fresh.asset_id !== playing.assetId ||
      fresh.version_id !== playing.versionId ||
      Date.now() >= fresh.expiresAt - EXPIRY_MARGIN_MS
    )
      return false
    source.current = {
      ...playing,
      url: fresh.mediaUrl,
      format: 'mp4',
      fallbackUrl: undefined,
      expiresAt: fresh.expiresAt,
    }
    await load(element, fresh.mediaUrl, resume.time, resume.play, 'mp4').catch(() => fail())
    return true
  }

  async function fallback(element: T): Promise<void> {
    let playing = source.current
    if (media.current !== element || !playing?.fallbackUrl || fallbackUsed.current) {
      fail()
      return
    }
    const current = { time: element.currentTime, play: !element.paused || wasPlaying.current }
    if (await playPrepared(element, playing, latest.current, current)) return
    fallbackUsed.current = true
    const warming = warmUp.current
    if (warming) {
      // A second request while the first still encodes would start a second encode.
      const id = loadingId.current
      setLoading(true)
      await warming.done
      if (media.current !== element || loadingId.current !== id) return
    }
    const resume = { time: element.currentTime, play: !element.paused || wasPlaying.current }
    if (Date.now() >= playing.expiresAt - EXPIRY_MARGIN_MS) {
      const id = loadingId.current
      refreshing.current = id
      const fresh = await callbacks.current.refresh().catch(() => undefined)
      if (refreshing.current === id) refreshing.current = null
      if (media.current !== element || loadingId.current !== id) return
      if (await playPrepared(element, playing, fresh, resume)) return
      if (
        !fresh?.fallbackUrl ||
        fresh.asset_id !== playing.assetId ||
        fresh.version_id !== playing.versionId ||
        Date.now() >= fresh.expiresAt - EXPIRY_MARGIN_MS
      ) {
        fail()
        return
      }
      playing = { ...playing, fallbackUrl: fresh.fallbackUrl, expiresAt: fresh.expiresAt }
    }
    if (!playing.fallbackUrl) {
      fail()
      return
    }
    source.current = { ...playing, url: playing.fallbackUrl, format: 'mp4' }
    await load(element, playing.fallbackUrl, resume.time, resume.play).catch(() => fail())
  }

  async function recover(networkFailure = false, status?: number): Promise<void> {
    if (refreshing.current === loadingId.current) return
    const element = media.current
    const playing = source.current
    const code = element?.error?.code
    if (
      !element ||
      !playing ||
      (!networkFailure && code === undefined) ||
      code === MediaError.MEDIA_ERR_ABORTED
    )
      return
    // Expiry first: Chrome reports a 403 on the first request as SRC_NOT_SUPPORTED.
    const expired = Date.now() >= playing.expiresAt - EXPIRY_MARGIN_MS
    const resume = { time: element.currentTime, play: !element.paused || wasPlaying.current }
    if (playing.format === 'hls' && !expired && status !== 401 && status !== 403) {
      // Chrome's native HLS rejects streams hls.js plays, such as decode timestamps that step back
      // between segments. Before the MP4, give hls.js the same stream from the same position.
      if (
        !networkFailure &&
        code !== MediaError.MEDIA_ERR_NETWORK &&
        hls.current === null &&
        !nativeHlsFailed.current &&
        element instanceof HTMLVideoElement
      ) {
        nativeHlsFailed.current = true
        warmFallback()
        await load(element, playing.url, resume.time, resume.play, 'hls').catch(() => fail())
        return
      }
      if (retried.current || !(networkFailure || code === MediaError.MEDIA_ERR_NETWORK)) {
        await fallback(element)
        return
      }
      retried.current = true
      await load(element, playing.url, resume.time, resume.play).catch(() => fail())
      return
    }
    // A codec the browser cannot decode (an AVI, an HEVC .mov) fails the same on a fresh link.
    if (resigned.current || !(expired || networkFailure || code === MediaError.MEDIA_ERR_NETWORK)) {
      fail()
      return
    }
    resigned.current = true
    const id = loadingId.current
    refreshing.current = id
    const fresh = await callbacks.current.refresh().catch(() => undefined)
    if (refreshing.current === id) refreshing.current = null
    // The dialog closed meanwhile: a detached player would still load and play, out of reach.
    if (media.current !== element || loadingId.current !== id) return
    if (
      fresh?.mediaUrl === undefined ||
      fresh.asset_id !== playing.assetId ||
      fresh.version_id !== playing.versionId ||
      Date.now() >= fresh.expiresAt - EXPIRY_MARGIN_MS
    ) {
      fail()
      return
    }
    const prepared = becamePrepared(playing, fresh)
    const url = prepared
      ? fresh.mediaUrl
      : playing.format === 'mp4' && playing.url === playing.fallbackUrl
        ? fresh.fallbackUrl
        : fresh.mediaUrl
    // Compare the selected URL: MP4 fallback grants differ from their primary HLS grants.
    if (!url || url === playing.url) {
      fail()
      return
    }
    const format = prepared ? 'mp4' : playing.format
    source.current = {
      ...playing,
      url,
      format,
      fallbackUrl: fresh.fallbackUrl,
      expiresAt: fresh.expiresAt,
    }
    await load(
      element,
      url,
      resume.time,
      resume.play,
      format,
      !prepared &&
        playing.fallbackUrl !== undefined &&
        playing.format === 'hls' &&
        hls.current !== null,
    ).catch(() => fail())
  }

  function renewHlsGrant(fresh: PlaybackSource): void {
    const element = media.current
    const playing = source.current
    if (
      !element ||
      failed ||
      refreshing.current === loadingId.current ||
      !playing?.fallbackUrl ||
      playing.format !== 'hls' ||
      !fresh.mediaUrl ||
      fresh.mediaUrl === playing.url ||
      fresh.asset_id !== playing.assetId ||
      fresh.version_id !== playing.versionId ||
      Date.now() < playing.expiresAt - 60_000 ||
      Date.now() >= fresh.expiresAt - EXPIRY_MARGIN_MS ||
      element.paused ||
      element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    )
      return
    // Preparation finished: the prepared MP4 takes over from here instead of a renewed stream.
    const prepared = becamePrepared(playing, fresh)
    source.current = {
      ...playing,
      url: fresh.mediaUrl,
      format: prepared ? 'mp4' : 'hls',
      fallbackUrl: fresh.fallbackUrl,
      expiresAt: fresh.expiresAt,
    }
    // hls.js transfers its MediaSource and buffered bytes to the freshly signed manifest.
    // Native HLS keeps the element and playback position but may briefly rebuffer on renewal.
    void load(
      element,
      fresh.mediaUrl,
      element.currentTime,
      true,
      prepared ? 'mp4' : 'hls',
      !prepared,
    ).catch(() => fail())
  }
  const syncHlsGrant = useRef(renewHlsGrant)
  useEffect(() => {
    syncHlsGrant.current = renewHlsGrant
  })
  useEffect(() => {
    syncHlsGrant.current(details)
  }, [details])

  function startPlayback(autoplay: boolean): void {
    const element = media.current
    if (!element) return
    if (details.mediaUrl === undefined) {
      fail()
      return
    }
    setFailed(false)
    resigned.current = false
    retried.current = false
    nativeHlsFailed.current = false
    source.current = {
      url: details.mediaUrl,
      expiresAt: details.expiresAt,
      assetId: details.asset_id,
      versionId: details.version_id,
      format: details.mediaFormat ?? 'original',
      fallbackUrl: details.fallbackUrl,
    }
    fallbackUsed.current = false
    warmUp.current?.controller.abort()
    warmUp.current = null
    wasPlaying.current = autoplay
    if (autoplay) setStarted(true)
    // Native HLS starts within Safari’s user activation; other browsers load hls.js on demand.
    void load(element, details.mediaUrl, 0, autoplay).catch(() => fail())
  }

  return {
    media,
    started,
    failed,
    loading,
    play: () => startPlayback(true),
    prepare: () => startPlayback(false),
    events: {
      onCanPlay: () => setLoading(false),
      onLoadedData: () => setLoading(false),
      onError: () => void recover(),
      onEnded: () => {
        wasPlaying.current = false
        awaitingPlayback.current = false
        callbacks.current.onPlaybackChange?.(false)
      },
      onPlay: () => {
        wasPlaying.current = true
        callbacks.current.onPlaybackChange?.(true)
      },
      onPause: () => {
        setLoading(false)
        // A failed first source can emit pause before its error/fallback has been handled.
        if (awaitingPlayback.current && source.current?.fallbackUrl && media.current?.error) return
        wasPlaying.current = false
        awaitingPlayback.current = false
        clearTimeout(startupTimer.current)
        callbacks.current.onPlaybackChange?.(false)
      },
      onWaiting: () => {
        if (media.current?.paused) return
        setLoading(true)
        // Native HLS can report an expired segment as waiting without a media error.
        if (
          source.current?.fallbackUrl &&
          Date.now() >= source.current.expiresAt - EXPIRY_MARGIN_MS
        ) {
          void recover(true)
        }
      },
      onPlaying: () => {
        setLoading(false)
        clearTimeout(startupTimer.current)
        awaitingPlayback.current = false
        resigned.current = false
        retried.current = false
        wasPlaying.current = true
        renewHlsGrant(details)
      },
    },
  }
}
