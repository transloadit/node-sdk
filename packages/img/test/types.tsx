import type {
  StoragePreviewModelOptions,
  TransloaditImageModelOptions,
  UrlImageModelOptions,
} from '../src/index.ts'
import type {
  StorageTransloaditImageProps,
  TransloaditImageComponent,
  TransloaditImageIntegration,
  TransloaditImageProps,
  TransloaditRedirectImageIntegration,
  UrlTransloaditImageProps,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'

const storageModel: StoragePreviewModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  formats: { avif: 45, webp: 75 },
  height: 300,
  source: { path: 'documents/report.pdf', type: 'storage' },
  width: 400,
}

const urlModel: UrlImageModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  source: {
    height: 600,
    type: 'url',
    url: 'https://assets.example/image.jpg',
    width: 800,
  },
}

const storageProps: StorageTransloaditImageProps = {
  alt: 'Preview of report.pdf',
  height: 300,
  src: { storage: 'documents/report.pdf' },
  width: 400,
}

const urlProps: UrlTransloaditImageProps = {
  alt: 'Public image',
  fallbackSrc: '/fallback.jpg',
  height: 600,
  sizes: '400px',
  src: 'https://assets.example/image.jpg',
  width: 800,
}

// @ts-expect-error Storage preview formats use format-specific quality values, not a tuple.
const storageWithTuple: StoragePreviewModelOptions = { ...storageModel, formats: ['webp'] }

// @ts-expect-error Public expiry belongs to factory policy, not an individual image.
const urlPropsWithExpiry: UrlTransloaditImageProps = { ...urlProps, expiresAt: Date.now() }

// @ts-expect-error Storage previews always use a signed JPEG fallback.
createTransloaditImageModel(
  {
    expiresAt: Date.UTC(2030, 0, 1),
    fallbackUrl: '/public/report.jpg',
    height: 300,
    source: { path: 'documents/report.pdf', type: 'storage' },
    width: 400,
  },
  () => '',
)

declare const Image: TransloaditImageComponent
declare const direct: TransloaditImageIntegration
declare const modelOptions: TransloaditImageModelOptions
declare const redirect: TransloaditRedirectImageIntegration
declare const unionProps: TransloaditImageProps
const unionModel = createTransloaditImageModel(modelOptions, () => '')
const unionImage = Image(unionProps)
const directImage = direct.Image(urlProps)
const redirectedImage = redirect.Image(storageProps)
const routeResponse = redirect.storageRoute(new Request('https://app.example/images'))
// @ts-expect-error Direct integrations do not expose an authorization route.
const missingRoute = direct.storageRoute
// @ts-expect-error Storage previews always use their signed JPEG fallback.
const storagePropsWithFallback = <Image {...storageProps} fallbackSrc="/report.jpg" />
// @ts-expect-error Storage previews do not support viewport-conditional activation.
const storagePropsWithMedia = <Image {...storageProps} media="(min-width: 768px)" />
// @ts-expect-error Public URL images use their own fallback URL instead of a JPEG quality.
const urlPropsWithFallbackQuality = <Image {...urlProps} fallbackQuality={70} />

void directImage
void missingRoute
void redirectedImage
void routeResponse
void storagePropsWithFallback
void storagePropsWithMedia
void storageWithTuple
void unionImage
void unionModel
void urlModel
void urlPropsWithExpiry
void urlPropsWithFallbackQuality
