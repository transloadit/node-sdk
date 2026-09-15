import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Local test control, shared by the browser runner and its isolated Next process. */
export const revokedAccessFile = resolve(process.cwd(), '.browser-access-revoked')

/** A fixture session represents application access, not a Smart CDN credential. */
export function authorizeFixtureImage({ request }: { request: Request }): boolean {
  const authenticated = request.headers
    .get('cookie')
    ?.split(';')
    .some((cookie) => cookie.trim() === 'fixture-session=fixture')
  return authenticated === true && !existsSync(revokedAccessFile)
}
