'use client'

import type { Components } from 'hast-util-to-jsx-runtime'
import type {
  AudioHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  Ref,
  VideoHTMLAttributes,
} from 'react'

import type { DocumentPreviewKind } from './document.ts'
import type { TransloaditPictureProps } from './picture.tsx'

import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, useEffect, useRef, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import {
  decodeDocumentText,
  MAX_DOCUMENT_PREVIEW_BYTES,
  MAX_RICH_DOCUMENT_PREVIEW_BYTES,
} from './document.ts'
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
    } & ImgHTMLAttributes<HTMLImageElement>)
  | ({ kind: 'video'; ref?: Ref<HTMLVideoElement> } & VideoHTMLAttributes<HTMLVideoElement>)
  | ({ kind: 'audio'; ref?: Ref<HTMLAudioElement> } & AudioHTMLAttributes<HTMLAudioElement>)
  | ({ kind: 'pdf'; src: string; title: string } & Omit<
      IframeHTMLAttributes<HTMLIFrameElement>,
      'sandbox' | 'src' | 'srcDoc' | 'title'
    >)
  | {
      kind: 'document'
      format: Exclude<DocumentPreviewKind, 'pdf'>
      bytes: ArrayBuffer
      title: string
      className?: string
      richClassName?: string
      textClassName?: string
      loadingFallback?: ReactNode
      errorFallback?: ReactNode
      onError?: () => void
    }

function DirectImage({
  alt,
  blurDataURL,
  decoding = 'async',
  loading = 'lazy',
  onLoad,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string; blurDataURL?: string }): ReactNode {
  const [loaded, setLoaded] = useState(false)
  if (
    blurDataURL !== undefined &&
    (blurDataURL.length > 6000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(blurDataURL))
  ) {
    throw new TypeError('blurDataURL must be a small inline PNG data URL')
  }
  return (
    // biome-ignore lint/performance/noImgElement: The application already authorized these bytes.
    <img
      {...props}
      alt={alt}
      decoding={decoding}
      loading={loading}
      style={
        !loaded && blurDataURL
          ? {
              backgroundImage: `url("${blurDataURL}")`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              ...style,
            }
          : style
      }
      onLoad={(event) => {
        setLoaded(true)
        onLoad?.(event)
      }}
    />
  )
}
const markdownProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
const markdownComponents: Partial<Components> = {
  // Documents must not load remote tracking pixels or navigate within their host application.
  img({ alt }) {
    return <span>{alt}</span>
  },
  a({ href, children }) {
    if (!href || !/^(https?:\/\/|mailto:)/iu.test(href)) return <span>{children}</span>
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
        {children}
      </a>
    )
  },
}

function RichText({
  bytes,
  title,
  className,
  loadingFallback,
  errorFallback,
  onError,
}: Extract<ViewerProps, { kind: 'document' }>): ReactNode {
  const [result, setResult] = useState<{
    bytes: ArrayBuffer
    html?: string
    failed?: boolean
  } | null>(null)
  const reportError = useRef(onError)
  useEffect(() => {
    reportError.current = onError
  }, [onError])
  useEffect(() => {
    let active = true
    // RTF's parser is loaded only when a rich-text document is actually opened.
    void import('./renderRtfPreview.ts')
      .then(({ renderRtfPreview }) => renderRtfPreview(bytes))
      .then(
        (html) => {
          if (active) setResult({ bytes, html })
        },
        () => {
          if (!active) return
          setResult({ bytes, failed: true })
          reportError.current?.()
        },
      )
    return () => {
      active = false
    }
  }, [bytes])
  if (result?.bytes !== bytes) return loadingFallback
  if (result.failed || result.html === undefined) return errorFallback
  return (
    <iframe
      srcDoc={result.html}
      sandbox=""
      referrerPolicy="no-referrer"
      title={title}
      className={className}
    />
  )
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
  if (props.kind === 'pdf') {
    const { kind: _kind, ...pdf } = props
    // Chromium does not render native PDFs inside a sandboxed iframe.
    return <iframe referrerPolicy="no-referrer" {...pdf} />
  }
  if (
    props.bytes.byteLength >
    (props.format === 'rtf' ? MAX_RICH_DOCUMENT_PREVIEW_BYTES : MAX_DOCUMENT_PREVIEW_BYTES)
  )
    return props.errorFallback
  if (props.format === 'rtf') return <RichText {...props} />
  const text = decodeDocumentText(props.bytes)
  return (
    <article
      aria-label={props.title}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Long documents must be keyboard-scrollable.
      tabIndex={0}
      className={props.className}
    >
      {props.format === 'markdown' && props.bytes.byteLength <= MAX_RICH_DOCUMENT_PREVIEW_BYTES ? (
        <div className={props.richClassName}>
          {toJsxRuntime(markdownProcessor.runSync(markdownProcessor.parse(text)), {
            Fragment,
            jsx,
            jsxs,
            components: markdownComponents,
          })}
        </div>
      ) : (
        <pre
          className={props.textClassName}
          style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        >
          {text}
        </pre>
      )}
    </article>
  )
}
