'use client'

import type { ReactNode, Ref, VideoHTMLAttributes } from 'react'

import type { StorageAssetReceipt } from './storage.ts'

import { useCallback, useLayoutEffect, useRef } from 'react'

import { getStorageAssetHref } from './storage.ts'

/** Native video backed by an exact Storage receipt and the app's existing authorized route. */
export interface VideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'poster'> {
  src: StorageAssetReceipt
  poster?: StorageAssetReceipt
  route?: string
  ref?: Ref<HTMLVideoElement>
}

function renewGrant(video: HTMLVideoElement): () => void {
  // Metadata can arrive before hydration attaches the ref.
  let renewable = video.readyState >= 1
  let playing = !video.paused
  const controller = new AbortController()
  const { signal } = controller
  let restore: AbortController | undefined
  let restoringPosition = false
  if (!renewable)
    video.addEventListener(
      'loadedmetadata',
      () => {
        renewable = true
      },
      { signal, once: true },
    )
  video.addEventListener(
    'play',
    () => {
      playing = true
    },
    { signal },
  )
  video.addEventListener(
    'pause',
    () => {
      playing = false
    },
    { signal },
  )
  video.addEventListener(
    'emptied',
    () => {
      playing = !video.paused
      // Before metadata, repeated loads of this immutable source share the pending restoration.
      if (!restoringPosition) return
      // An explicit caller load() cancels the pending seek; do not restore stale intent later.
      restore?.abort()
      video.addEventListener(
        'loadeddata',
        () => {
          renewable = true
        },
        { signal, once: true },
      )
    },
    { signal },
  )
  video.addEventListener(
    'error',
    () => {
      restore?.abort()
      // Chromium reports an expired range grant as MEDIA_ERR_NETWORK. A failed initial load,
      // denied renewal or decoding failure must not become a retry loop or a public fallback.
      if (!renewable || video.error?.code !== 2) return
      renewable = false
      const position = video.currentTime
      const resume = playing
      const playbackRate = video.playbackRate
      const autoplay = video.autoplay
      // load() resets native pause/rate state and rearms autoplay without a pause event.
      playing = false
      video.autoplay = false
      restore = new AbortController()
      const options = { signal: restore.signal, once: true }
      const preload = video.preload
      // Even a previously played preload="none" element needs data to restore its position.
      // Return to the caller's policy on completion, refusal or unmount.
      video.preload = 'auto'
      restore.signal.addEventListener(
        'abort',
        () => {
          restoringPosition = false
          if (video.preload === 'auto') video.preload = preload
          video.autoplay = autoplay
        },
        { once: true },
      )
      video.addEventListener(
        'loadedmetadata',
        () => {
          restoringPosition = true
          video.playbackRate = playbackRate
          const restored = () => {
            renewable = true
            // Clear the native can-autoplay flag before restoring the caller's attribute.
            video.pause()
            restore?.abort()
            // Browser autoplay policy may require another user gesture; native controls remain.
            if (resume) void video.play().catch(() => {})
          }
          // Setting zero to zero need not emit seeked. Wait for actual data in that case.
          video.addEventListener(position === 0 ? 'loadeddata' : 'seeked', restored, options)
          if (position > 0) video.currentTime = position
        },
        options,
      )
      // This is the same app route, not the expired redirect target: admission is checked again.
      video.load()
    },
    { signal },
  )
  return () => {
    controller.abort()
    restore?.abort()
  }
}

function Player({ src, poster, route, ref, ...props }: VideoProps): ReactNode {
  const element = useRef<HTMLVideoElement | null>(null)
  // Recovery belongs to the element, not to an inline consumer ref's changing identity.
  useLayoutEffect(() => {
    if (element.current) return renewGrant(element.current)
  }, [])
  const attach = useCallback(
    (video: HTMLVideoElement | null) => {
      element.current = video
      if (!video) return
      const cleanupRef = typeof ref === 'function' ? ref(video) : undefined
      if (ref && typeof ref !== 'function') ref.current = video
      return () => {
        if (typeof cleanupRef === 'function') cleanupRef()
        else if (typeof ref === 'function') ref(null)
        else if (ref) ref.current = null
      }
    },
    [ref],
  )
  return (
    <video
      controls
      playsInline
      preload="metadata"
      {...props}
      ref={attach}
      src={getStorageAssetHref(src, { action: 'original', route })}
      poster={poster ? getStorageAssetHref(poster, { action: 'original', route }) : undefined}
    />
  )
}

/** Renews failed private range grants without losing playback position or bypassing authorization. */
export function Video(props: VideoProps): ReactNode {
  return (
    <Player
      key={JSON.stringify([
        props.src.workspace,
        getStorageAssetHref(props.src, { action: 'original', route: props.route }),
      ])}
      {...props}
    />
  )
}
