'use client'

import type {
  AudioHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  Ref,
  VideoHTMLAttributes,
} from 'react'

import type { DocumentPreviewReason } from './document.ts'
import type { DocumentViewerProps } from './documentViewer.tsx'
import type { PdfViewerProps } from './pdfViewer.tsx'
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

export type { DocumentPreviewReason, ViewerKind } from './document.ts'
export type {
  DocumentPreview,
  DocumentPreviewOptions,
  DocumentSource,
} from './useDocumentPreview.ts'
export type { MediaPlayback, PlaybackSource } from './useMediaPlayback.ts'

export { viewerKind } from './document.ts'
export { useDocumentPreview } from './useDocumentPreview.ts'
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
      mode?: 'frame'
      unsupportedFallback?: ReactNode
      src: string
      title: string
      allowSameOrigin?: boolean
      errorFallback?: ReactNode
    } & Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'sandbox' | 'src' | 'srcDoc' | 'title'>)
  | ({ kind: 'pdf'; mode: 'pdfjs'; allowSameOrigin?: boolean } & PdfViewerProps)
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
    onError?.('network')
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

function PdfFailure({
  onError,
  reason,
  children,
}: {
  onError?: (reason: DocumentPreviewReason) => void
  reason: DocumentPreviewReason
  children?: ReactNode
}): ReactNode {
  const reported = useRef(false)
  useEffect(() => {
    if (!reported.current) onError?.(reason)
    reported.current = true
  }, [onError, reason])
  return children ?? <p role="alert">PDF preview unavailable.</p>
}

function LazyPdf(props: PdfViewerProps): ReactNode {
  const [Renderer] = useState(() =>
    lazy(async () => {
      try {
        return { default: (await import('./pdfViewer.tsx')).PdfViewer }
      } catch {
        return { default: PdfChunkFailure }
      }
    }),
  )
  return (
    <Suspense fallback={props.loadingFallback ?? <p role="status">Loading PDF…</p>}>
      <Renderer {...props} />
    </Suspense>
  )
}

function PdfChunkFailure({ onError, errorFallback }: PdfViewerProps): ReactNode {
  return (
    <PdfFailure reason="network" onError={onError}>
      {errorFallback}
    </PdfFailure>
  )
}

function PdfDocument({
  allowSameOrigin = false,
  ...props
}: Extract<ViewerProps, { kind: 'pdf' }>): ReactNode {
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin)
  if (origin === null) return null
  let url: URL | undefined
  try {
    url = new URL(props.src, document.baseURI)
  } catch {
    /* Handled alongside disallowed origins. */
  }
  if (
    !url ||
    !['https:', 'http:'].includes(url.protocol) ||
    (!allowSameOrigin && url.origin === origin)
  ) {
    if (props.mode !== 'pdfjs') return props.errorFallback
    return (
      <PdfFailure key={props.src} reason="unsupported" onError={props.onError}>
        {props.unsupportedFallback ?? props.errorFallback}
      </PdfFailure>
    )
  }
  if (props.mode === 'pdfjs')
    return (
      <LazyPdf
        key={JSON.stringify([url.href, props.workerSrc, props.assetBaseUrl])}
        {...props}
        src={url.href}
      />
    )
  const { kind: _kind, mode: _mode, errorFallback: _error, unsupportedFallback, ...frame } = props
  if (navigator.pdfViewerEnabled === false && unsupportedFallback !== undefined)
    return unsupportedFallback
  return <iframe {...frame} src={url.href} referrerPolicy="no-referrer" />
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
