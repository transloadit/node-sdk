'use client'

import type {
  AudioHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  Ref,
  RefObject,
  VideoHTMLAttributes,
} from 'react'

import type { DocumentPreviewReason } from './document.ts'
import type { DocumentViewerProps } from './documentViewer.tsx'
import type { PdfReaderProps, PdfViewerProps } from './pdfViewer.tsx'
import type { TransloaditPictureProps } from './picture.tsx'

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { pdfUrl } from './pdfUrl.ts'
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
      loadingFallback?: ReactNode
      renderError?: PdfViewerProps['renderError']
      timeoutMs?: number
      mime?: string
      onError?: (reason: DocumentPreviewReason) => void
      unsupportedFallback?: ReactNode
      src: string
      title: string
      allowSameOrigin?: boolean
      errorFallback?: ReactNode
    } & Omit<
      IframeHTMLAttributes<HTMLIFrameElement>,
      'sandbox' | 'src' | 'srcDoc' | 'title' | 'onError'
    >)
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
  return children
}

function PdfAttempt(props: PdfReaderProps): ReactNode {
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
    <Suspense fallback={props.loadingFallback}>
      <Renderer {...props} />
    </Suspense>
  )
}

function PdfChunkFailure({ fail }: PdfReaderProps): ReactNode {
  return <PdfFailure reason="network" onError={fail} />
}

function PdfRetry({
  retry,
  retryHost,
  label = 'Retry PDF',
}: {
  retry: () => void
  retryHost: RefObject<HTMLDivElement | null>
  label?: string
}): ReactNode {
  const button = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (document.activeElement === retryHost.current) button.current?.focus()
  }, [retryHost])
  return (
    <div>
      <p role="alert">Could not display this PDF.</p>
      <button ref={button} type="button" onClick={retry}>
        {label}
      </button>
    </div>
  )
}

function LazyPdf({
  invalidUrl,
  ...props
}: PdfViewerProps & { allowSameOrigin: boolean; invalidUrl: boolean }): ReactNode {
  const retryHost = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState<DocumentPreviewReason>()
  const [renewFirst, setRenewFirst] = useState<'expired' | 'forbidden'>()
  const fail = useCallback((error: DocumentPreviewReason) => {
    if (retryHost.current?.contains(document.activeElement)) retryHost.current.focus()
    setFailure((current) => current ?? error)
  }, [])
  const reason = invalidUrl ? 'invalid-url' : failure

  const retry = (): void => {
    if (invalidUrl) return
    retryHost.current?.focus()
    setRenewFirst(
      props.renew && (reason === 'expired' || reason === 'forbidden') ? reason : undefined,
    )
    setFailure(undefined)
  }
  const fallback = reason === 'unsupported' ? props.unsupportedFallback : undefined
  return (
    <div ref={retryHost} tabIndex={-1}>
      {reason ? (
        <PdfFailure key={reason} reason={reason} onError={props.onError}>
          {fallback ?? props.renderError?.(reason, retry) ?? props.errorFallback ?? (
            <PdfRetry retry={retry} retryHost={retryHost} label={props.labels?.retry} />
          )}
        </PdfFailure>
      ) : (
        <PdfAttempt {...props} retryHost={retryHost} fail={fail} renewFirst={renewFirst} />
      )}
    </div>
  )
}

function PdfDocument({
  allowSameOrigin = false,
  ...props
}: Extract<ViewerProps, { kind: 'pdf' }>): ReactNode {
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin)
  if (origin === null) return null
  const url = pdfUrl(props.src, document.baseURI)
  const invalidUrl = !url || (!allowSameOrigin && url.origin === origin)
  if (props.mode === 'pdfjs') {
    return (
      <LazyPdf
        key={JSON.stringify([props.documentKey ?? url?.href ?? props.src, allowSameOrigin])}
        {...props}
        allowSameOrigin={allowSameOrigin}
        invalidUrl={invalidUrl && props.src !== undefined}
      />
    )
  }
  if (!url || invalidUrl) {
    return (
      <PdfFailure key={props.src} reason="invalid-url" onError={props.onError}>
        {props.errorFallback}
      </PdfFailure>
    )
  }
  const { mime, onError, errorFallback, unsupportedFallback } = props
  if (mime !== undefined && mime.split(';')[0]?.trim().toLowerCase() !== 'application/pdf') {
    return (
      <PdfFailure key={mime} reason="invalid-mime" onError={onError}>
        {errorFallback}
      </PdfFailure>
    )
  }
  if (navigator.pdfViewerEnabled === false && unsupportedFallback !== undefined)
    return (
      <PdfFailure reason="unsupported" onError={onError}>
        {unsupportedFallback}
      </PdfFailure>
    )
  return <PdfFrame key={url.href} {...props} src={url.href} />
}

function PdfFrame({
  kind: _kind,
  mode: _mode,
  mime: _mime,
  unsupportedFallback: _unsupportedFallback,
  onError,
  onLoad,
  errorFallback,
  loadingFallback,
  renderError,
  timeoutMs = 30_000,
  ...frame
}: Extract<ViewerProps, { mode?: 'frame' }>): ReactNode {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state !== 'loading') return
    const timer = setTimeout(() => setState('error'), timeoutMs)
    return () => clearTimeout(timer)
  }, [state, timeoutMs])
  function retry(): void {
    host.current?.focus()
    setState('loading')
  }
  return (
    <div ref={host} tabIndex={-1}>
      {state === 'error' ? (
        <PdfFailure reason="network" onError={onError}>
          {renderError?.('network', retry) ?? errorFallback ?? (
            <PdfRetry retry={retry} retryHost={host} />
          )}
        </PdfFailure>
      ) : (
        <>
          {state === 'loading' && (loadingFallback ?? <p role="status">Loading PDF…</p>)}
          <iframe
            {...frame}
            onLoad={(event) => {
              setState('loaded')
              if (document.activeElement === host.current) event.currentTarget.focus()
              onLoad?.(event)
            }}
            onError={() => setState('error')}
            referrerPolicy="no-referrer"
          />
        </>
      )}
    </div>
  )
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
