'use client'

import type { CSSProperties, ReactNode } from 'react'

import type { ImageProps } from './react.tsx'

import { useEffect, useRef, useState } from 'react'

import { createBlurDataURL } from './placeholder.ts'
import { Image } from './react.tsx'
import { snapshotStorageImage, snapshotStoragePolicy } from './storage.ts'

const frame: CSSProperties = { position: 'relative', width: '100%', height: '100%' }
const fitted: CSSProperties = { width: '100%', height: '100%', objectFit: 'contain' }

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
  const blur = state === 'loading' ? createBlurDataURL(snapshotStorageImage(props.src)) : undefined
  const frameRef = useRef<HTMLDivElement>(null)
  const notified = useRef(false)
  const onReady = props.onReady
  useEffect(() => {
    // Fallbacks may contain their own images; they must never count as the primary load.
    if (state !== 'loading') return
    // SSR images can finish before hydration attaches onLoad. Read the actual native image.
    const image = frameRef.current?.querySelector('picture img')
    if (image instanceof HTMLImageElement && image.complete) {
      setState(image.naturalWidth > 0 ? 'ready' : 'error')
      if (image.naturalWidth > 0 && !notified.current) {
        notified.current = true
        onReady?.()
      }
    }
  }, [onReady, state])
  return (
    <div ref={frameRef} className={props.className} style={frame} aria-busy={state === 'loading'}>
      {state === 'error' ? (
        props.errorFallback
      ) : (
        <>
          {state !== 'loading' || blur === undefined ? null : (
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
            onLoad={() => {
              setState('ready')
              if (!notified.current) {
                notified.current = true
                props.onReady?.()
              }
            }}
            onError={() => setState('error')}
          />
          {state === 'loading' ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              {props.loadingFallback}
            </div>
          ) : null}
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
 * The caller chooses the neighbor and whether the guest's connection permits speculative work.
 */
export interface ImagePrefetchProps
  extends Pick<ImageProps, 'src' | 'route' | 'policy' | 'sizes'> {}

/** Low-priority image prefetch using the viewer's responsive source selection. */
export function ImagePrefetch(props: ImagePrefetchProps): ReactNode {
  return (
    <div hidden aria-hidden="true">
      <Image {...props} alt="" sizes={props.sizes ?? '100vw'} loading="eager" fetchPriority="low" />
    </div>
  )
}
