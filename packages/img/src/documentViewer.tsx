'use client'

import type { Components } from 'hast-util-to-jsx-runtime'
import type { ReactNode } from 'react'

import type { DocumentPreviewKind, DocumentPreviewReason } from './document.ts'

import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Component, Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
  /** Locally rendered document format; PDFs use Viewer's separate PDF kind. */
  format: Exclude<DocumentPreviewKind, 'pdf'>
  /** Authorized document bytes, bounded again before parsing. */
  bytes: ArrayBuffer
  /** Accessible name for the document article or RTF frame. */
  title: string
  /** Styles the Markdown/text article or the RTF iframe. */
  className?: string
  /** Styles rendered Markdown inside the article. */
  richClassName?: string
  /** Styles the literal text view, including oversized Markdown. */
  textClassName?: string
  /** Shown while the document renderer or RTF parser loads. */
  loadingFallback?: ReactNode
  /** Shown when document loading, parsing or size validation fails. */
  errorFallback?: ReactNode
  /** Reports a document loading, parsing or size failure. */
  onError?: (reason: DocumentPreviewReason) => void
  mime?: string | null
  truncated?: boolean
  notices?: { truncated?: string; rawMarkdown?: string }
  rtfColors?: { text?: string; background?: string }
  colorScheme?: 'light' | 'dark' | 'auto'
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
  colorScheme,
  rtfColors,
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
      .then(({ renderRtfPreview }) =>
        renderRtfPreview(bytes, colorScheme, rtfColors?.text, rtfColors?.background),
      )
      .then(
        (html) => {
          if (active) setResult({ bytes, html })
        },
        () => {
          if (!active) return
          setResult({ bytes, failed: true })
          reportError.current?.('parse')
        },
      )
    return () => {
      active = false
    }
  }, [bytes, colorScheme, rtfColors?.text, rtfColors?.background])
  if (result?.bytes !== bytes) return loadingFallback
  if (result.failed || result.html === undefined) return errorFallback
  return (
    <iframe
      data-tl-viewer="rtf"
      srcDoc={result.html}
      sandbox=""
      referrerPolicy="no-referrer"
      title={title}
      className={className}
    />
  )
}

function DocumentFailure({
  bytes,
  onError,
  errorFallback,
  reason = 'parse',
}: DocumentViewerProps & { reason?: DocumentPreviewReason }): ReactNode {
  const reportError = useRef(onError)
  useEffect(() => {
    reportError.current = onError
  }, [onError])
  const reported = useRef<ArrayBuffer | null>(null)
  useEffect(() => {
    if (reported.current === bytes) return
    reported.current = bytes
    reportError.current?.(reason)
  }, [bytes, reason])
  return errorFallback
}

function MarkdownDocument({ bytes, mime, richClassName }: DocumentViewerProps): ReactNode {
  // A 256 KiB GFM document can take multiple frames to parse; grant refreshes reuse its bytes.
  const content = useMemo(
    () =>
      toJsxRuntime(
        markdownProcessor.runSync(markdownProcessor.parse(decodeDocumentText(bytes, mime))),
        {
          Fragment,
          jsx,
          jsxs,
          components: markdownComponents,
          tableCellAlignToStyle: false,
        },
      ),
    [bytes, mime],
  )
  return (
    <div data-tl-markdown="" className={richClassName}>
      {content}
    </div>
  )
}

interface MarkdownState {
  bytes: ArrayBuffer
  failed: boolean
}

// Byte limits do not bound nesting depth: parser and renderer failures must stay in the preview.
class MarkdownBoundary extends Component<DocumentViewerProps, MarkdownState> {
  override state: MarkdownState = { bytes: this.props.bytes, failed: false }

  static getDerivedStateFromProps(
    props: DocumentViewerProps,
    state: MarkdownState,
  ): MarkdownState | null {
    return props.bytes === state.bytes ? null : { bytes: props.bytes, failed: false }
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render(): ReactNode {
    return this.state.failed ? (
      <DocumentFailure {...this.props} />
    ) : (
      <MarkdownDocument {...this.props} />
    )
  }
}

/** Render only locally parsed content; raw HTML and external embedded resources stay inert. */
export function DocumentViewer(props: DocumentViewerProps): ReactNode {
  if (props.format === 'rtf') {
    if (props.truncated || props.bytes.byteLength > MAX_RICH_DOCUMENT_PREVIEW_BYTES)
      return <DocumentFailure {...props} reason="too-large" />
    return <RichText {...props} />
  }
  const truncated = props.truncated || props.bytes.byteLength > MAX_DOCUMENT_PREVIEW_BYTES
  const rawMarkdown =
    props.format === 'markdown' &&
    (truncated || props.bytes.byteLength > MAX_RICH_DOCUMENT_PREVIEW_BYTES)
  return (
    <article
      data-tl-viewer="document"
      aria-label={props.title}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Long documents must be keyboard-scrollable.
      tabIndex={0}
      className={props.className}
    >
      {truncated && (
        <p role="status">{props.notices?.truncated ?? 'Preview truncated to the first 2 MiB.'}</p>
      )}
      {rawMarkdown && (
        <p role="status">
          {props.notices?.rawMarkdown ??
            'Showing Markdown as plain text because this document exceeds the rich preview limit.'}
        </p>
      )}
      {props.format === 'markdown' && !rawMarkdown ? (
        <MarkdownBoundary {...props} />
      ) : (
        <pre className={props.textClassName}>
          {decodeDocumentText(props.bytes, props.mime, truncated)}
        </pre>
      )}
    </article>
  )
}
