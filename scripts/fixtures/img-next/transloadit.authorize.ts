import type { AuthorizeTransloaditStorageImage } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from './browser-policy.ts'

/** Toy application authorization, exercised using the browser's real HttpOnly session cookie. */
export const authorize: AuthorizeTransloaditStorageImage = authorizeFixtureImage
