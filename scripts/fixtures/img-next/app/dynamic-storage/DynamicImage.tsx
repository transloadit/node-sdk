'use client'

import type { StorageImageReceipt } from '@transloadit/viewer/react'

import { getStorageAssetHref, Image } from '@transloadit/viewer/react'
import { useState } from 'react'

import { dynamicPolicy } from '../../dynamic-policy.ts'

const route = '/fixture/api/transloadit/media'

export function DynamicImage({ receipt }: { receipt: StorageImageReceipt }) {
  const [revision, setRevision] = useState(0)
  return (
    <>
      <h1>Dynamic receipt image</h1>
      <Image
        src={receipt}
        route={route}
        policy={dynamicPolicy}
        alt="Dynamic avatar"
        sizes="320px"
        loading="eager"
        style={{ width: 320, height: 'auto' }}
        retryKey={revision}
        errorFallback={<p role="status">Image access denied</p>}
      />
      <button type="button" onClick={() => setRevision(revision + 1)}>
        Refresh receipt: {revision}
      </button>
      <a href={getStorageAssetHref(receipt, { action: 'download', route })}>Download avatar</a>
    </>
  )
}
