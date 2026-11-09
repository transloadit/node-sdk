'use client'

import type { CSSProperties, ReactNode } from 'react'

import type { ImageProps } from './react.tsx'

import { useEffect, useRef, useState } from 'react'

import { createBlurDataURL } from './placeholder.ts'
import { Image } from './react.tsx'
import { snapshotStorageImage, snapshotStoragePolicy } from './storage.ts'

const frame: CSSProperties = { position: 'relative', width: '100%', height: '100%' }
const fitted: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
}
const feedback: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
}

/** Caller-owned accessible loading/error UI; receipt pixels must already be authorized. */
export interface ImagePreviewProps
  extends Pick<
    ImageProps,
    'src' | 'route' | 'policy' | 'alt' | 'sizes' | 'className' | 'retryKey'
  > {
  loadingFallback: ReactNode
  errorFallback: ReactNode
  onReady?: () => void
}

function Preview(props: ImagePreviewProps): ReactNode {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  // Metadata can be enriched for the same version; normalize alpha without resetting its load.
  const source = snapshotStorageImage(props.src)
  const blur = state === 'loading' ? createBlurDataURL(source, { warn: false }) : undefined
  const frameRef = useRef<HTMLDivElement>(null)
  const notified = useRef(false)
  const onReady = props.onReady
  useEffect(() => {
    // Fallbacks may contain their own images; they must never count as the primary load.
    if (state !== 'loading') return
    const image = frameRef.current?.querySelector('picture img')
    if (!(image instanceof HTMLImageElement)) return
    let active = true
    let generation = 0
    const loaded = () => {
      const request = image.currentSrc
      const current = ++generation
      const isCurrent = () => active && current === generation && request === image.currentSrc
      const ready = () => {
        if (!isCurrent()) return
        setState('ready')
        if (!notified.current) {
          notified.current = true
          onReady?.()
        }
      }
      // A native load can precede async pixel decoding. Keep the blur until it can be painted.
      void image.decode().then(ready, () => {
        // Some browsers refuse decode for large but displayable images; retain native success.
        if (image.complete && image.naturalWidth > 0) ready()
        else if (isCurrent()) setState('error')
      })
    }
    image.addEventListener('load', loaded)
    // SSR images can finish before hydration attaches the load listener.
    if (image.complete) {
      if (image.naturalWidth > 0) loaded()
      else setState('error')
    }
    return () => {
      active = false
      image.removeEventListener('load', loaded)
    }
  }, [onReady, state])
  return (
    <div
      ref={frameRef}
      className={props.className}
      style={{ ...frame, aspectRatio: `${source.width} / ${source.height}` }}
      aria-busy={state === 'loading'}
    >
      {state === 'error' ? (
        <div style={feedback}>{props.errorFallback}</div>
      ) : (
        <>
          {state !== 'loading' || blur === undefined ? null : (
            // ThumbHash geometry is approximate; contain avoids stretching blur across letterbox bars.
            // biome-ignore lint/performance/noImgElement: Already decoded, inline receipt pixels.
            <img
              src={blur}
              alt=""
              aria-hidden="true"
              style={{ ...fitted, position: 'absolute', inset: 0 }}
            />
          )}
          <Image
            src={props.src}
            route={props.route}
            policy={props.policy}
            alt={props.alt}
            sizes={props.sizes ?? '100vw'}
            loading="eager"
            objectFit="contain"
            style={{ ...fitted, position: 'relative' }}
            onError={() => setState('error')}
          />
          {state === 'loading' ? <div style={feedback}>{props.loadingFallback}</div> : null}
        </>
      )}
    </div>
  )
}

/** Immediate letterboxed image with a removable ThumbHash and non-blocking loading feedback. */
export function ImagePreview(props: ImagePreviewProps): ReactNode {
  // Reset failed/ready state when URLs, responsive selection or explicit recovery change.
  return (
    <Preview
      key={JSON.stringify([
        props.src.workspace,
        props.src.asset_id,
        props.src.version_id,
        props.route,
        snapshotStoragePolicy(props.policy),
        props.sizes,
        props.retryKey,
      ])}
      {...props}
    />
  )
}

/**
 * Warm one likely next image using the same browser-selected candidates as ImagePreview.
 * Mount only after the current image loads; request cancellation on unmount is browser-dependent.
 * The caller chooses the neighbor; Save-Data and slow connection estimates suppress prefetch.
 */
export interface ImagePrefetchProps
  extends Pick<ImageProps, 'src' | 'route' | 'policy' | 'sizes'> {}

/** Low-priority image prefetch using the viewer's responsive source selection. */
export function ImagePrefetch(props: ImagePrefetchProps): ReactNode {
  const [state, setState] = useState<'initial' | 'mounted' | 'ready'>('initial')
  useEffect(() => {
    // Check on mount, not during SSR: speculative bytes must wait for client network policy.
    if (!('connection' in navigator)) {
      setState('mounted')
      return
    }
    const connection = navigator.connection
    if (!connection || typeof connection !== 'object' || Array.isArray(connection)) {
      setState('mounted')
      return
    }
    const allowed =
      !('saveData' in connection && connection.saveData === true) &&
      !(
        'effectiveType' in connection &&
        (connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          connection.effectiveType === '3g')
      )
    if (allowed) setState('mounted')
  }, [])
  useEffect(() => {
    // WebKit can fetch the fallback before a detached eager img joins its picture. Attach the
    // complete hidden picture lazily, then enable loading so it selects only the final source.
    if (state === 'mounted') setState('ready')
  }, [state])
  if (state === 'initial') return null
  return (
    <div hidden aria-hidden="true">
      <Image
        {...props}
        alt=""
        sizes={props.sizes ?? '100vw'}
        loading={state === 'ready' ? 'eager' : 'lazy'}
        fetchPriority="low"
      />
    </div>
  )
}
