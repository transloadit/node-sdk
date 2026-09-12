'use client'

import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { cloneElement, useEffect, useRef, useState } from 'react'

interface StorageImageErrorBoundaryProps {
  children: ReactElement<ComponentProps<'picture'>>
  fallback: ReactNode
}

/** Retains the SSR picture; only an opted-in failed image switches to application-owned UI. */
export function StorageImageErrorBoundary({
  children,
  fallback,
}: StorageImageErrorBoundaryProps): ReactNode {
  const picture = useRef<HTMLPictureElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const image = picture.current?.querySelector('img')
    // The browser can finish (and fail) a native image request before hydration attaches events.
    if (image?.complete && image.currentSrc !== '' && image.naturalWidth === 0) setFailed(true)
  }, [])
  return failed
    ? fallback
    : cloneElement(children, {
        ref: picture,
        onErrorCapture(event) {
          if (event.target instanceof HTMLImageElement) setFailed(true)
        },
      })
}
