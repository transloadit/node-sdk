'use client'

import type { StorageImageReceipt } from '@transloadit/viewer/react'

import { getStorageAssetHref, Image } from '@transloadit/viewer/react'
import { ImagePrefetch, ImagePreview } from '@transloadit/viewer/react/preview'
import { useState } from 'react'

import { dynamicPolicy } from '../../dynamic-policy.ts'

const route = '/fixture/api/transloadit/media'

export function DynamicImage({
  receipt,
  alpha,
}: {
  receipt: StorageImageReceipt
  alpha: StorageImageReceipt
}) {
  const [revision, setRevision] = useState(0)
  const [showVariants, setShowVariants] = useState(false)
  const [showPreviews, setShowPreviews] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
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
        placeholder="blur"
        style={{ width: 320, height: 'auto' }}
        retryKey={revision}
        errorFallback={<p role="status">Image access denied</p>}
      />
      <button type="button" onClick={() => setRevision(revision + 1)}>
        Refresh receipt: {revision}
      </button>
      <a href={getStorageAssetHref(receipt, { action: 'download', route })}>Download avatar</a>
      <button type="button" onClick={() => setShowPreviews(true)}>
        Show photo previews
      </button>
      {showPreviews ? (
        <>
          <section aria-label="Intrinsic preview" style={{ width: 320 }}>
            <ImagePreview
              src={receipt}
              route={route}
              policy={dynamicPolicy}
              sizes="320px"
              alt="Intrinsic photo"
              loadingFallback={<span role="status">Loading photo…</span>}
              errorFallback={<span role="alert">Photo unavailable</span>}
              onReady={() => setPreviewReady(true)}
            />
          </section>
          <section aria-label="Caller-sized preview" style={{ width: 320, height: 160 }}>
            <ImagePreview
              src={receipt}
              route={route}
              policy={dynamicPolicy}
              sizes="320px"
              alt="Letterboxed photo"
              loadingFallback={<span role="status">Loading photo…</span>}
              errorFallback={<span role="alert">Photo unavailable</span>}
            />
          </section>
          {previewReady ? (
            <>
              <p>Preview ready</p>
              <ImagePrefetch src={alpha} route={route} policy={dynamicPolicy} sizes="320px" />
            </>
          ) : null}
        </>
      ) : null}
      <button type="button" onClick={() => setShowVariants(true)}>
        Show placeholder variants
      </button>
      {showVariants ? (
        <section aria-label="Placeholder variants">
          <Image
            src={alpha}
            route={route}
            policy={dynamicPolicy}
            alt="Transparent receipt"
            placeholder="blur"
            loading="eager"
            sizes="64px"
            style={{ width: 64, height: 64 }}
          />
          <Image
            src={receipt}
            route={route}
            policy={dynamicPolicy}
            alt="Letterboxed receipt"
            placeholder="blur"
            loading="eager"
            objectFit="contain"
            sizes="320px"
            style={{ width: 320, height: 320, backgroundColor: 'white' }}
          />
          <Image
            src={receipt}
            route={route}
            policy={dynamicPolicy}
            alt="Cropped receipt"
            placeholder="blur"
            loading="eager"
            crop="square"
            sizes="320px"
            style={{ width: 320, height: 320 }}
          />
        </section>
      ) : null}
    </>
  )
}
