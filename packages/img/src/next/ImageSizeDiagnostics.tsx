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
    function inspect(): void {
      const image = container?.querySelector('img')
      if (!(image instanceof HTMLImageElement) || warned.has(image)) return
      const cssWidth = image.getBoundingClientRect().width
      if (cssWidth <= 0 || image.currentSrc === '') return
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
    inspect()
    container.addEventListener('load', inspect, true)
    window.addEventListener('resize', inspect)
    return () => {
      container.removeEventListener('load', inspect, true)
      window.removeEventListener('resize', inspect)
    }
  }, [])
  return (
    <span ref={ref} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}
