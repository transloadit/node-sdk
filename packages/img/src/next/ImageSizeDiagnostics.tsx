'use client'

import type { ReactNode } from 'react'

import { useEffect, useRef } from 'react'

interface ImageSizeDiagnosticsProps {
  children: ReactNode
}

/** Development-only native candidate inspection; the production renderer omits this boundary. */
export function ImageSizeDiagnostics({ children }: ImageSizeDiagnosticsProps): ReactNode {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const container = ref.current
    if (container === null) return
    const warned = new WeakSet<HTMLImageElement>()
    let frame = 0
    let observedImage: HTMLImageElement | undefined
    const observer = new ResizeObserver(schedule)
    function schedule(): void {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(inspect)
    }
    function inspect(): void {
      const image = container?.querySelector('img')
      if (!(image instanceof HTMLImageElement) || warned.has(image)) return
      if (observedImage !== image) {
        observer.disconnect()
        observer.observe(image)
        observedImage = image
      }
      if (!image.complete || image.naturalWidth === 0 || image.currentSrc === '') return
      const { width: cssWidth, height } = image.getBoundingClientRect()
      // Streamed/hydrating content can temporarily have a 1px box before its real layout.
      if (cssWidth <= 1 || height <= 0) return
      // naturalWidth is density-corrected CSS pixels. A larger cached/HiDPI candidate alone
      // does not imply incorrect sizes when its intended display width matches the real box.
      if (image.naturalWidth <= 2 * cssWidth) return
      const sources = image.closest('picture')?.querySelectorAll('source') ?? []
      // A JPEG fallback has no width descriptor; its decoded natural width is unscaled.
      let width = image.naturalWidth
      for (const source of sources) {
        for (const match of source.srcset.matchAll(/(?:^|, )(\S+) (\d+)w/g)) {
          if (new URL(match[1], image.baseURI).href !== image.currentSrc) continue
          width = Number(match[2])
        }
      }
      if (width <= 2 * cssWidth) return
      warned.add(image)
      console.warn(
        `[StorageImage] The selected ${width}px candidate is more than twice its ${Math.round(cssWidth)}px rendered width. Set sizes to match the image’s CSS width.`,
      )
    }
    schedule()
    container.addEventListener('load', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      container.removeEventListener('load', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return (
    <span ref={ref} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}
