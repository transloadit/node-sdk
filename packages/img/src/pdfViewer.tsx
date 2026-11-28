'use client'

import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import type { ReactNode } from 'react'

import type { DocumentPreviewReason } from './document.ts'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { getDocument, PDFWorker } from '#pdfjs'

import { DocumentPreviewError, readPreviewContent } from './readPreviewContent.ts'

export interface PdfViewerProps {
  src: string
  title: string
  labels?: {
    navigation?: string
    previous?: string
    next?: string
    original?: string
    page?: (number: number) => string
    position?: (number: number, count: number) => string
  }
  workerSrc?: string
  assetBaseUrl?: string
  className?: string
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  unsupportedFallback?: ReactNode
  onLoad?: () => void
  onError?: (reason: DocumentPreviewReason) => void
}

interface PageProps {
  pdf: PDFDocumentProxy
  number: number
  width: number
  loaded: () => void
  failed: () => void
  label: string
  loading: ReactNode
}

function PdfPage({ pdf, number, width, loaded, failed, loading, label }: PageProps): ReactNode {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const surface = canvas.current
    if (!surface || width <= 0) return
    let active = true
    let render: RenderTask | undefined
    let page: PDFPageProxy | undefined
    async function draw(surface: HTMLCanvasElement): Promise<void> {
      page = await pdf.getPage(number)
      if (!active) return
      const original = page.getViewport({ scale: 1 })
      const scale = Math.min(
        (width * (window.devicePixelRatio || 1)) / original.width,
        Math.sqrt(4_000_000 / (original.width * original.height)),
        8192 / Math.max(original.width, original.height),
      )
      const viewport = page.getViewport({ scale })
      surface.width = Math.max(1, Math.floor(viewport.width))
      surface.height = Math.max(1, Math.floor(viewport.height))
      render = page.render({ canvas: surface, viewport })
      await render.promise
      if (active) {
        setReady(true)
        loaded()
      }
    }
    void draw(surface).catch(() => {
      if (active) failed()
    })
    return () => {
      active = false
      render?.cancel()
      page?.cleanup()
      surface.width = 0
      surface.height = 0
    }
  }, [pdf, number, width, loaded, failed])
  return (
    <>
      {!ready && loading}
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{ width: '100%', height: 'auto', display: ready ? 'block' : 'none' }}
      />
    </>
  )
}

/** Single-page reader. Page changes and resizes release the old canvas backing store. */
export function PdfViewer({
  src,
  title,
  workerSrc,
  assetBaseUrl,
  labels,
  className,
  loadingFallback,
  errorFallback,
  unsupportedFallback,
  onError,
  onLoad,
}: PdfViewerProps): ReactNode {
  const [pdf, setPdf] = useState<PDFDocumentProxy>()
  const [reason, setReason] = useState<DocumentPreviewReason>()
  const [number, setNumber] = useState(1)
  const [width, setWidth] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onError, onLoad })
  useLayoutEffect(() => {
    callbacks.current = { onError, onLoad }
  }, [onError, onLoad])
  const firstPageLoaded = useRef(false)
  const loaded = useCallback(() => {
    if (!firstPageLoaded.current) {
      firstPageLoaded.current = true
      callbacks.current.onLoad?.()
    }
  }, [])
  const failed = useCallback(() => setReason('parse'), [])
  useEffect(() => {
    if (reason) {
      setPdf(undefined)
      callbacks.current.onError?.(reason)
    }
  }, [reason])
  useEffect(() => {
    if (reason) return
    const controller = new AbortController()
    let port: Worker | undefined
    let workerHandle: PDFWorker | undefined
    function releaseWorker(): void {
      workerHandle?.destroy()
      port?.terminate()
      port = undefined
      workerHandle = undefined
    }
    let task: PDFDocumentLoadingTask | undefined
    async function load(): Promise<void> {
      const worker =
        workerSrc === undefined
          ? new URL('/assets/transloadit-viewer/pdf.worker.min.mjs', location.origin)
          : new URL(workerSrc, location.href)
      if (!['https:', 'http:'].includes(worker.protocol) || worker.origin !== location.origin) {
        throw new DocumentPreviewError('unsupported')
      }
      const assets = assetBaseUrl
        ? new URL(assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`, location.href)
        : new URL('.', worker)
      if (assets.origin !== location.origin || !['https:', 'http:'].includes(assets.protocol))
        throw new DocumentPreviewError('unsupported')
      const content = await readPreviewContent(src, controller.signal, {
        limit: 64 * 1024 * 1024,
        pdf: true,
      })
      controller.signal.throwIfAborted()
      // Owning the module worker avoids PDF.js's process-wide fallback after a worker startup failure.
      port = new Worker(worker, { type: 'module' })
      port.addEventListener(
        'error',
        () => {
          releaseWorker()
          if (!controller.signal.aborted) setReason('network')
        },
        { once: true },
      )
      workerHandle = PDFWorker.create({ port })
      task = getDocument({
        worker: workerHandle,
        cMapUrl: new URL('cmaps/', assets).href,
        standardFontDataUrl: new URL('standard_fonts/', assets).href,
        wasmUrl: new URL('wasm/', assets).href,
        useWorkerFetch: true,
        data: content.bytes,
        useWasm: false,
        disableWorkerRendering: true,
        canvasMaxAreaInBytes: 16_000_000,
      })
      const document = await task.promise
      if (!controller.signal.aborted) setPdf(document)
    }
    void load().catch((error: unknown) => {
      if (controller.signal.aborted) return
      setReason(
        error instanceof DocumentPreviewError && error.reason !== 'unavailable'
          ? error.reason
          : task
            ? 'parse'
            : 'network',
      )
    })
    return () => {
      controller.abort()
      if (task) void task.destroy().then(releaseWorker, releaseWorker)
      else releaseWorker()
    }
  }, [src, workerSrc, assetBaseUrl, reason])
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    let resize: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      clearTimeout(resize)
      // CSS fits the existing canvas immediately. Re-rasterize once the container settles.
      resize = setTimeout(() => setWidth(Math.floor(entry.contentRect.width)), 80)
    })
    observer.observe(element)
    return () => {
      clearTimeout(resize)
      observer.disconnect()
    }
  }, [])
  const loading = loadingFallback ?? <p role="status">Loading PDF…</p>
  const count = pdf?.numPages ?? 1
  function go(page: number): void {
    setNumber(Math.max(1, Math.min(count, page)))
  }
  if (reason) {
    const fallback =
      reason === 'unsupported' ? (unsupportedFallback ?? errorFallback) : errorFallback
    return fallback ?? <p role="alert">Could not display this PDF.</p>
  }
  return (
    <section
      aria-label={title}
      data-tl-viewer="pdf"
      className={className}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Focus the reader to navigate pages with the keyboard.
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        switch (event.key) {
          case 'ArrowRight':
            go(number + 1)
            break
          case 'ArrowLeft':
            go(number - 1)
            break
          case 'Home':
            go(1)
            break
          case 'End':
            go(count)
            break
          default:
            return
        }
        event.preventDefault()
      }}
    >
      {pdf ? (
        <nav aria-label={labels?.navigation ?? 'PDF pages'}>
          <button type="button" aria-disabled={number === 1} onClick={() => go(number - 1)}>
            {labels?.previous ?? 'Previous page'}
          </button>
          <span aria-live="polite">
            {labels?.position?.(number, count) ?? `Page ${number} of ${count}`}
          </span>
          <button type="button" aria-disabled={number === count} onClick={() => go(number + 1)}>
            {labels?.next ?? 'Next page'}
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
            {labels?.original ?? 'Open original PDF'}
          </a>
        </nav>
      ) : (
        loading
      )}
      <div ref={container}>
        {pdf && (
          <PdfPage
            key={`${number}/${width}`}
            pdf={pdf}
            number={number}
            width={width}
            label={labels?.page?.(number) ?? `PDF page ${number}`}
            loaded={loaded}
            failed={failed}
            loading={loading}
          />
        )}
      </div>
    </section>
  )
}
