'use client'

import type {
  AudioHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  Ref,
  VideoHTMLAttributes,
} from 'react'

import type { DocumentViewerProps } from './documentViewer.tsx'
import type { TransloaditPictureProps } from './picture.tsx'

import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { TransloaditPicture } from './picture.tsx'

export type { MediaPlayback, PlaybackSource } from './useMediaPlayback.ts'

export { useMediaPlayback } from './useMediaPlayback.ts'

/** Caller-owned controls, authorization and styles surround the shared renderer. */
export type ViewerProps =
  | ({ kind: 'image' } & TransloaditPictureProps)
  | ({
      kind: 'image'
      src: string
      alt: string
      model?: never
      blurDataURL?: string
      objectFit?: 'contain' | 'cover'
    } & ImgHTMLAttributes<HTMLImageElement>)
  | ({ kind: 'video'; ref?: Ref<HTMLVideoElement> } & VideoHTMLAttributes<HTMLVideoElement>)
  | ({ kind: 'audio'; ref?: Ref<HTMLAudioElement> } & AudioHTMLAttributes<HTMLAudioElement>)
  | ({
      kind: 'pdf'
      src: string
      title: string
      allowSameOrigin?: boolean
      errorFallback?: ReactNode
    } & Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'sandbox' | 'src' | 'srcDoc' | 'title'>)
  | ({ kind: 'document' } & DocumentViewerProps)

function DirectImage({
  alt,
  blurDataURL,
  decoding = 'async',
  loading = 'lazy',
  onLoad,
  objectFit,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  alt: string
  blurDataURL?: string
  objectFit?: 'contain' | 'cover'
}): ReactNode {
  const [loaded, setLoaded] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    // SSR images can finish before hydration attaches the load handler.
    if (image.current?.complete && image.current.naturalWidth > 0) setLoaded(true)
  }, [])
  const placeholder =
    blurDataURL !== undefined &&
    blurDataURL.length <= 6000 &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(blurDataURL)
      ? blurDataURL
      : undefined
  return (
    // biome-ignore lint/performance/noImgElement: The application already authorized these bytes.
    <img
      {...props}
      ref={image}
      alt={alt}
      decoding={decoding}
      loading={loading}
      style={
        !loaded && placeholder
          ? {
              backgroundImage: `url("${placeholder}")`,
              backgroundSize: (objectFit ?? style?.objectFit) === 'cover' ? 'cover' : 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              ...style,
              objectFit: objectFit ?? style?.objectFit,
            }
          : { ...style, objectFit: objectFit ?? style?.objectFit }
      }
      onLoad={(event) => {
        setLoaded(true)
        onLoad?.(event)
      }}
    />
  )
}
function DocumentLoadFailure({ bytes, onError, errorFallback }: DocumentViewerProps): ReactNode {
  const reported = useRef<ArrayBuffer | null>(null)
  useEffect(() => {
    if (reported.current === bytes) return
    reported.current = bytes
    onError?.()
  }, [bytes, onError])
  return errorFallback
}

function LazyDocument(props: DocumentViewerProps): ReactNode {
  // A failed chunk must stay local to the preview. A new opening gets a fresh lazy resource,
  // so React's cached rejection cannot poison every document preview for the rest of the tab.
  const [Renderer] = useState(() =>
    lazy(async () => {
      try {
        const { DocumentViewer } = await import('./documentViewer.tsx')
        return { default: DocumentViewer }
      } catch {
        return { default: DocumentLoadFailure }
      }
    }),
  )
  return (
    <Suspense fallback={props.loadingFallback}>
      <Renderer {...props} />
    </Suspense>
  )
}

const subscribeOrigin = () => () => {}
const browserOrigin = () => window.location.origin
const serverOrigin = () => null

function PdfDocument({
  allowSameOrigin = false,
  errorFallback,
  ...props
}: Extract<ViewerProps, { kind: 'pdf' }>): ReactNode {
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin)
  if (origin === null) return null
  let url: URL
  try {
    url = new URL(props.src, origin)
  } catch {
    return errorFallback
  }
  if (!['https:', 'http:'].includes(url.protocol) || (!allowSameOrigin && url.origin === origin))
    return errorFallback
  const { kind: _kind, ...frame } = props
  // Native PDF rendering requires an unsandboxed frame on a separate user-content origin.
  return <iframe {...frame} referrerPolicy="no-referrer" />
}

/**
 * Renders authorized images, media and documents without owning an application's admission rules.
 * Media can use native URLs or the exported signed-source playback hook. PDF frames use the
 * browser's viewer. Markdown is sanitized into React elements in the page. RTF is parsed locally
 * and rendered in a sandboxed frame with a restrictive content security policy.
 */
export function Viewer(props: ViewerProps): ReactNode {
  if (props.kind === 'image') {
    const { kind: _kind, ...image } = props
    return image.model === undefined ? (
      <DirectImage key={image.src} {...image} />
    ) : (
      <TransloaditPicture {...image} />
    )
  }
  if (props.kind === 'video') {
    const { kind: _kind, ...video } = props
    return <video controls playsInline preload="none" {...video} />
  }
  if (props.kind === 'audio') {
    const { kind: _kind, ...audio } = props
    return <audio controls preload="none" {...audio} />
  }
  if (props.kind === 'pdf') return <PdfDocument {...props} />
  return <LazyDocument {...props} />
}
