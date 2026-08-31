'use client'

import type { ReactNode } from 'react'

import { useSyncExternalStore } from 'react'

interface HydratedTransloaditPictureProps {
  children: ReactNode
  fallback: ReactNode
}

const subscribe = (): (() => void) => () => {}
const getClientSnapshot = (): true => true
const getServerSnapshot = (): false => false

/** Mounts responsive source elements after hydration while retaining a no-script fallback. */
export function HydratedTransloaditPicture({
  children,
  fallback,
}: HydratedTransloaditPictureProps): ReactNode {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  return hydrated ? children : <noscript>{fallback}</noscript>
}
