'use client'

import type { ReactNode } from 'react'

import { useState, useSyncExternalStore } from 'react'

const subscribe = (): (() => void) => () => undefined

/** A user-visible interaction distinguishes parsed HTML from hydrated application JavaScript. */
export function HydrationProbe(): ReactNode {
  const [count, setCount] = useState(0)
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return (
    <button disabled={!hydrated} onClick={() => setCount(count + 1)} type="button">
      Hydration count: {count}
    </button>
  )
}
