'use client'

import type { ReactNode } from 'react'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

/** Local fixture sign-in followed by an ordinary same-page RSC refresh. */
export function SignIn(): ReactNode {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch('/fixture/api/fixture-session', { method: 'POST' })
          if (!response.ok) throw new Error('Fixture sign-in failed')
          await response.text()
          router.refresh()
        })
      }
    >
      Sign in and refresh
    </button>
  )
}
