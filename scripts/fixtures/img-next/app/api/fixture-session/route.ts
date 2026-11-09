import { cookies } from 'next/headers'

/** Synthetic local-only login; unlike a Server Action, this requires router.refresh(). */
export async function POST(): Promise<Response> {
  const cookieStore = await cookies()
  cookieStore.set('fixture-session', 'fixture', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
  })
  return new Response(null, { status: 204 })
}
