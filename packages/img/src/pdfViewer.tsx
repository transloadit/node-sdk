'use client'

import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import type { ReactNode, RefObject } from 'react'

import type { DocumentPreviewReason } from './document.ts'
import type { RenewPdf } from './pdfNetwork.ts'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { getDocument, PDFWorker, TextLayer } from '#pdfjs'

import { openPdfNetwork } from './pdfNetwork.ts'
import { pdfUrl } from './pdfUrl.ts'
import { previewDeadline } from './previewDeadline.ts'
import { DocumentPreviewError } from './readPreviewContent.ts'

export interface PdfViewerProps {
  src?: string
  /** Immutable asset/version identity when the parent rotates signed URLs. */
  documentKey?: string
  title: string
  filename?: string
  expiresAt?: number
  renew?: RenewPdf
  timeoutMs?: number
  originalLink?: ReactNode
  labels?: {
    navigation?: string
    previous?: string
    next?: string
    pageInput?: string
    zoomIn?: string
    zoomOut?: string
    fitWidth?: string
    fitPage?: string
    retry?: string
    page?: (number: number) => string
    position?: (number: number, count: number, percent: number) => string
  }
  workerSrc?: string
  assetBaseUrl?: string
  className?: string
  loadingFallback?: ReactNode
  unsupportedFallback?: ReactNode
  errorFallback?: ReactNode
  renderError?: (reason: DocumentPreviewReason, retry: () => void) => ReactNode
  onLoad?: () => void
  onError?: (reason: DocumentPreviewReason) => void
}

interface PageProps {
  pdf: PDFDocumentProxy
  number: number
  width: number
  height: number
  fitPage: boolean
  zoom: number
  loaded: (page: number, percent: number) => void
  failed: (reason: DocumentPreviewReason) => void
  label: string
}

function PdfPage({
  pdf,
  number,
  width,
  height,
  fitPage,
  zoom,
  loaded,
  failed,
  label,
}: PageProps): ReactNode {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = host.current
    if (!target || width <= 0 || (fitPage && height <= 0)) return
    let active = true
    let raster: RenderTask | undefined
    let text: TextLayer | undefined
    let page: PDFPageProxy | undefined
    async function draw(target: HTMLDivElement): Promise<void> {
      page = await pdf.getPage(number)
      if (!active) return
      const original = page.getViewport({ scale: 1 })
      const fit = Math.min(
        width / original.width,
        fitPage ? height / original.height : Number.POSITIVE_INFINITY,
      )
      const viewport = page.getViewport({ scale: fit * zoom })
      const resolution = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(4_000_000 / (viewport.width * viewport.height)),
        8192 / Math.max(viewport.width, viewport.height),
      )
      const sheet = document.createElement('div')
      sheet.style.position = 'relative'
      sheet.style.width = `${viewport.width}px`
      sheet.style.height = `${viewport.height}px`
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width * resolution))
      canvas.height = Math.max(1, Math.floor(viewport.height * resolution))
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.role = 'img'
      canvas.ariaLabel = label
      const layer = document.createElement('div')
      layer.className = 'tl-pdf-text'
      layer.style.setProperty('--total-scale-factor', String(viewport.scale))
      text = new TextLayer({
        container: layer,
        viewport,
        textContentSource: page.streamTextContent(),
      })
      raster = page.render({ canvas, viewport, transform: [resolution, 0, 0, resolution, 0, 0] })
      await Promise.all([text.render(), raster.promise])
      if (!active) return
      sheet.append(canvas, layer)
      target.replaceChildren(sheet)
      loaded(number, Math.round(viewport.scale * 100))
    }
    void draw(target).catch(() => {
      if (active) failed('parse')
    })
    return () => {
      active = false
      raster?.cancel()
      text?.cancel()
      page?.cleanup()
    }
  }, [pdf, number, width, height, fitPage, zoom, label, loaded, failed])
  return <div ref={host} />
}

export interface PdfReaderProps extends PdfViewerProps {
  retryHost: RefObject<HTMLDivElement | null>
  allowSameOrigin: boolean
  renewFirst?: 'expired' | 'forbidden'
  fail: (reason: DocumentPreviewReason) => void
}

/** Render a single PDF with its own worker and swap the raster and selectable text together. */
export function PdfViewer({
  src,
  title,
  filename,
  workerSrc,
  assetBaseUrl,
  renew,
  retryHost,
  allowSameOrigin,
  renewFirst,
  expiresAt,
  timeoutMs,
  labels,
  className,
  loadingFallback,
  originalLink,
  onLoad,
  fail,
}: PdfReaderProps): ReactNode {
  const [pdf, setPdf] = useState<PDFDocumentProxy>()
  const [number, setNumber] = useState(1)
  const [input, setInput] = useState('1')
  const [visible, setVisible] = useState<{ page: number; percent: number }>()
  const [fitPage, setFitPage] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const container = useRef<HTMLDivElement>(null)
  const reader = useRef<HTMLElement>(null)
  const touch = useRef<{ x: number; y: number } | undefined>(undefined)
  const grant = useRef({ mediaUrl: src, expiresAt })
  useLayoutEffect(() => {
    grant.current = { mediaUrl: src, expiresAt }
  }, [src, expiresAt])
  useLayoutEffect(() => {
    if (document.activeElement === retryHost.current) reader.current?.focus()
  }, [retryHost])
  const callbacks = useRef({ onLoad, renew })
  useLayoutEffect(() => {
    callbacks.current = { onLoad, renew }
  }, [onLoad, renew])
  const firstPageLoaded = useRef(false)
  const loaded = useCallback((page: number, percent: number) => {
    setVisible({ page, percent })
    if (!firstPageLoaded.current) {
      firstPageLoaded.current = true
      callbacks.current.onLoad?.()
    }
  }, [])
  const [settings] = useState(() => ({ workerSrc, assetBaseUrl, filename, timeoutMs, renewFirst }))
  useEffect(() => {
    const { workerSrc, assetBaseUrl, filename, timeoutMs, renewFirst } = settings
    const controller = new AbortController()
    const startup = previewDeadline(controller.signal, timeoutMs)
    let initialized = false
    let port: Worker | undefined
    let worker: PDFWorker | undefined
    let task: PDFDocumentLoadingTask | undefined
    function release(): void {
      worker?.destroy()
      port?.terminate()
      port = undefined
      worker = undefined
    }
    function failed(reason: DocumentPreviewReason): void {
      if (controller.signal.aborted) return
      controller.abort()
      fail(reason)
    }
    async function load(): Promise<void> {
      if (typeof Worker === 'undefined') throw new DocumentPreviewError('unsupported')
      const workerUrl = pdfUrl(
        workerSrc ?? '/assets/transloadit-viewer/pdf.worker.min.mjs',
        location.href,
      )
      if (!workerUrl) throw new DocumentPreviewError('invalid-url')
      const assets = assetBaseUrl
        ? pdfUrl(assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`, location.href)
        : new URL('.', workerUrl)
      if (!assets || [workerUrl, assets].some((url) => url.origin !== location.origin))
        throw new DocumentPreviewError('invalid-url')
      port = new Worker(workerUrl, { type: 'module' })
      port.addEventListener(
        'error',
        () => {
          failed('network')
          release()
        },
        { once: true },
      )
      worker = PDFWorker.create({ port })
      const network = await openPdfNetwork({
        getGrant: () => grant.current,
        getRenew: () => callbacks.current.renew,
        filename,
        renewFirst,
        timeoutMs,
        allowSameOrigin,
        signal: controller.signal,
        fail: failed,
      })
      controller.signal.throwIfAborted()
      startup.reset()
      task = getDocument({
        ...network,
        worker,
        rangeChunkSize: 64 * 1024,
        disableAutoFetch: true,
        // Range-capable servers serve requested chunks on demand. Other servers stream the initial GET.
        disableStream: true,
        cMapUrl: new URL('cmaps/', assets).href,
        standardFontDataUrl: new URL('standard_fonts/', assets).href,
        wasmUrl: new URL('wasm/', assets).href,
        useWorkerFetch: true,
        useWasm: false,
        disableWorkerRendering: true,
        canvasMaxAreaInBytes: 16_000_000,
      })
      task.onProgress = startup.reset
      const document = await startup.wait(task.promise)
      initialized = true
      startup.dispose()
      if (!controller.signal.aborted) setPdf(document)
    }
    void load().catch((error: unknown) =>
      failed(
        error instanceof DocumentPreviewError && error.reason !== 'unavailable'
          ? error.reason
          : startup.signal.aborted || !task
            ? 'network'
            : 'parse',
      ),
    )
    return () => {
      controller.abort()
      startup.dispose()
      if (task) void task.destroy().then(release, release)
      if (!initialized) release()
    }
  }, [settings, allowSameOrigin, fail])
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const count = pdf?.numPages ?? 1
  function go(page: number): void {
    const next = Math.max(1, Math.min(count, Number.isInteger(page) ? page : number))
    setNumber(next)
    setInput(String(next))
  }
  return (
    <section
      ref={reader}
      aria-label={title}
      data-tl-viewer="pdf"
      className={className}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Focus the reader to navigate pages with the keyboard.
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return
        switch (event.key) {
          case 'PageDown':
          case 'ArrowRight':
            go(number + 1)
            break
          case 'PageUp':
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
      {pdf && (
        <nav aria-label={labels?.navigation ?? 'PDF pages'}>
          <button type="button" aria-disabled={number === 1} onClick={() => go(number - 1)}>
            {labels?.previous ?? 'Previous page'}
          </button>
          <input
            aria-label={labels?.pageInput ?? 'Page number'}
            type="number"
            inputMode="numeric"
            min={1}
            max={count}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => go(Number(input || number))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') go(Number(input || number))
            }}
          />
          <button type="button" aria-disabled={number === count} onClick={() => go(number + 1)}>
            {labels?.next ?? 'Next page'}
          </button>
          <button
            type="button"
            disabled={zoom <= 0.25}
            onClick={() => setZoom((value) => Math.max(0.25, value / 1.25))}
          >
            {labels?.zoomOut ?? 'Zoom out'}
          </button>
          <button
            type="button"
            disabled={zoom >= 4}
            onClick={() => setZoom((value) => Math.min(4, value * 1.25))}
          >
            {labels?.zoomIn ?? 'Zoom in'}
          </button>
          <button
            type="button"
            aria-pressed={!fitPage}
            onClick={() => {
              setFitPage(false)
              setZoom(1)
            }}
          >
            {labels?.fitWidth ?? 'Fit width'}
          </button>
          <button
            type="button"
            aria-pressed={fitPage}
            onClick={() => {
              setFitPage(true)
              setZoom(1)
            }}
          >
            {labels?.fitPage ?? 'Fit page'}
          </button>
          {originalLink}
        </nav>
      )}
      <div role="status">
        {visible
          ? (labels?.position?.(visible.page, count, visible.percent) ??
            `Page ${visible.page} of ${count}, ${visible.percent}%`)
          : (loadingFallback ?? 'Loading PDF…')}
      </div>
      <div
        ref={container}
        onTouchStart={(event) => {
          const point = event.touches[0]
          touch.current =
            event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : undefined
        }}
        onTouchCancel={() => {
          touch.current = undefined
        }}
        onTouchEnd={(event) => {
          const start = touch.current
          touch.current = undefined
          const end = event.changedTouches[0]
          const viewport = event.currentTarget
          // Leave horizontal panning, pinch zoom and text selection to the browser.
          if (
            !start ||
            !end ||
            event.touches.length ||
            viewport.scrollWidth > viewport.clientWidth ||
            window.getSelection()?.type === 'Range'
          )
            return
          const dx = end.clientX - start.x
          if (Math.abs(dx) >= 50 && Math.abs(dx) > 2 * Math.abs(end.clientY - start.y))
            go(number + (dx < 0 ? 1 : -1))
        }}
        style={{ overflow: 'auto', height: 'var(--tl-viewer-pdf-height, 70dvh)' }}
      >
        {pdf && (
          <PdfPage
            pdf={pdf}
            number={number}
            width={size.width}
            height={size.height}
            fitPage={fitPage}
            zoom={zoom}
            label={labels?.page?.(number) ?? `PDF page ${number}`}
            loaded={loaded}
            failed={fail}
          />
        )}
      </div>
    </section>
  )
}
