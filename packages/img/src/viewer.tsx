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

import { lazy, Suspense, useState, useSyncExternalStore } from 'react'

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
const DocumentRenderer = lazy(async () => {
  const { DocumentViewer } = await import('./documentViewer.tsx')
  return { default: DocumentViewer }
})

const subscribeOrigin = () => () => {}
const browserOrigin = () => window.location.origin
const serverOrigin = () => null

function PdfDocument({
  allowSameOrigin = false,
  errorFallback,
  ...props
}: Extract<ViewerProps, { kind: 'pdf' }>): ReactNode {
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin)
  if (origin === null) return errorFallback
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
 * browser's viewer; rich text is parsed locally into inert, sandboxed markup.
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
  return (
    <Suspense fallback={props.loadingFallback}>
      <DocumentRenderer {...props} />
    </Suspense>
  )
}
