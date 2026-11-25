'use client'

import type { Components } from 'hast-util-to-jsx-runtime'
import type { ReactNode } from 'react'

import type { DocumentPreviewKind } from './document.ts'

import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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

/** Authorized document bytes and application-owned presentation and feedback. */
export interface DocumentViewerProps {
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
}: DocumentViewerProps): ReactNode {
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

function DocumentFailure({ bytes, onError, errorFallback }: DocumentViewerProps): ReactNode {
  const reportError = useRef(onError)
  useEffect(() => {
    reportError.current = onError
  }, [onError])
  const reported = useRef<ArrayBuffer | null>(null)
  useEffect(() => {
    if (reported.current === bytes) return
    reported.current = bytes
    reportError.current?.()
  }, [bytes])
  return errorFallback
}

function MarkdownDocument({ bytes, richClassName }: DocumentViewerProps): ReactNode {
  // A 256 KiB GFM document can take multiple frames to parse; grant refreshes reuse its bytes.
  const content = useMemo(
    () =>
      toJsxRuntime(markdownProcessor.runSync(markdownProcessor.parse(decodeDocumentText(bytes))), {
        Fragment,
        jsx,
        jsxs,
        components: markdownComponents,
      }),
    [bytes],
  )
  return <div className={richClassName}>{content}</div>
}

/** Render only locally parsed content; raw HTML and external embedded resources stay inert. */
export function DocumentViewer(props: DocumentViewerProps): ReactNode {
  if (
    props.bytes.byteLength >
    (props.format === 'rtf' ? MAX_RICH_DOCUMENT_PREVIEW_BYTES : MAX_DOCUMENT_PREVIEW_BYTES)
  )
    return <DocumentFailure {...props} />
  if (props.format === 'rtf') return <RichText {...props} />
  return (
    <article
      aria-label={props.title}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Long documents must be keyboard-scrollable.
      tabIndex={0}
      className={props.className}
    >
      {props.format === 'markdown' && props.bytes.byteLength <= MAX_RICH_DOCUMENT_PREVIEW_BYTES ? (
        <MarkdownDocument {...props} />
      ) : (
        <pre
          className={props.textClassName}
          style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        >
          {decodeDocumentText(props.bytes)}
        </pre>
      )}
    </article>
  )
}
