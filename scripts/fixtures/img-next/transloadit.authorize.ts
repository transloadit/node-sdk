import type { AuthorizeTransloaditImage } from '@transloadit/viewer/next/server'

import { authorizeFixtureImage } from './browser-policy.ts'

/** Toy application authorization, exercised using the browser's real HttpOnly session cookie. */
export const authorize: AuthorizeTransloaditImage = authorizeFixtureImage
