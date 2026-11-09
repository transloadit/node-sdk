import type { StorageRenditionPolicy } from '@transloadit/viewer/react'

/** Non-secret policy shared by this synthetic dynamic receipt consumer and its server route. */
export const dynamicPolicy = {
  maximumWidth: 640,
  formats: { png: 80 },
  crops: { square: { aspectRatio: 1, maximumWidth: 320 } },
} satisfies StorageRenditionPolicy
