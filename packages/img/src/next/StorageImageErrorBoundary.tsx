'use client'

import type { ComponentProps, ReactNode } from 'react'

import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react'

interface StorageImageErrorBoundaryProps {
  children: ReactNode
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
  if (failed) return fallback
  // Flight can deliver children as a lazy reference, not a directly cloneable React element.
  const elements = Children.toArray(children)
  const element = elements[0]
  if (
    elements.length !== 1 ||
    !isValidElement<ComponentProps<'picture'>>(element) ||
    element.type !== 'picture'
  ) {
    throw new Error('Storage image error fallback requires one picture')
  }
  return cloneElement(element, {
    ref: picture,
    onErrorCapture(event) {
      if (event.target instanceof HTMLImageElement) setFailed(true)
    },
  })
}
