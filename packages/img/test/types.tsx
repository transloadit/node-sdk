import type {
  StoragePreviewModelOptions,
  TransloaditImageModelOptions,
  UrlImageModelOptions,
} from '../src/index.ts'
import type {
  StorageTransloaditImageProps,
  TransloaditImageComponent,
  TransloaditImageProps,
  UrlTransloaditImageProps,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'

const storageModel: StoragePreviewModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  formats: { avif: 45, webp: 75 },
  height: 300,
  source: { path: 'documents/report.pdf', type: 'storage' },
  width: 400,
  widths: [200, 400],
}

const urlModel: UrlImageModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  source: {
    height: 600,
    type: 'url',
    url: 'https://assets.example/image.jpg',
    width: 800,
  },
  widths: [200, 400],
}

const storageProps: StorageTransloaditImageProps = {
  alt: 'Preview of report.pdf',
  height: 300,
  sizes: '400px',
  source: { path: 'documents/report.pdf', type: 'storage' },
  width: 400,
  widths: [200, 400],
}

const urlProps: UrlTransloaditImageProps = {
  alt: 'Public image',
  expiresAt: Date.UTC(2030, 0, 1),
  fallbackSrc: '/fallback.jpg',
  height: 300,
  sizes: '400px',
  source: {
    height: 600,
    type: 'url',
    url: 'https://assets.example/image.jpg',
    width: 800,
  },
  width: 400,
  widths: [200, 400],
}

// @ts-expect-error Storage preview formats use format-specific quality values, not a tuple.
const storageWithTuple: StoragePreviewModelOptions = { ...storageModel, formats: ['webp'] }

const storageWithStaticExpiry: StorageTransloaditImageProps = {
  ...storageProps,
  // @ts-expect-error Private Storage URLs must use request-rendered bounded expiry.
  expiresAt: Date.UTC(2030, 0, 1),
}

// @ts-expect-error Storage previews always use a signed JPEG fallback.
createTransloaditImageModel(
  {
    expiresAt: Date.UTC(2030, 0, 1),
    fallbackUrl: '/public/report.jpg',
    height: 300,
    source: { path: 'documents/report.pdf', type: 'storage' },
    width: 400,
    widths: [200, 400],
  },
  () => '',
)

declare const TransloaditImage: TransloaditImageComponent
declare const modelOptions: TransloaditImageModelOptions
declare const unionProps: TransloaditImageProps
const unionModel = createTransloaditImageModel(modelOptions, () => '')
const unionImage = TransloaditImage(unionProps)
// @ts-expect-error Storage previews always use a signed JPEG fallback.
const storagePropsWithFallback = <TransloaditImage {...storageProps} fallbackSrc="/report.jpg" />
// @ts-expect-error A media condition can first activate after a Storage signature has expired.
const storagePropsWithMedia = <TransloaditImage {...storageProps} media="(min-width: 768px)" />
// @ts-expect-error Public URL images use their own fallback URL instead of a JPEG quality.
const urlPropsWithFallbackQuality = <TransloaditImage {...urlProps} fallbackQuality={70} />

void storageWithTuple
void storagePropsWithFallback
void storagePropsWithMedia
void storageWithStaticExpiry
void storageProps
void unionImage
void unionModel
void urlPropsWithFallbackQuality
void urlModel
void urlProps
