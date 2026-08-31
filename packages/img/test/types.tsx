import type { TransloaditImageModelOptions } from '../src/index.ts'
import type {
  TransloaditImageComponent,
  TransloaditImageIntegration,
  TransloaditImageProps,
  TransloaditRedirectImageIntegration,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'

const modelOptions: TransloaditImageModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  formats: { avif: 45, webp: 75 },
  height: 300,
  src: 'documents/report.pdf',
  width: 400,
}

const imageProps: TransloaditImageProps = {
  alt: 'Preview of report.pdf',
  height: 300,
  src: 'documents/report.pdf',
  width: 400,
}

// @ts-expect-error Storage preview formats use format-specific quality values, not a tuple.
const modelWithTuple: TransloaditImageModelOptions = { ...modelOptions, formats: ['webp'] }

createTransloaditImageModel(
  {
    expiresAt: Date.UTC(2030, 0, 1),
    // @ts-expect-error Storage previews always use a signed JPEG fallback.
    fallbackUrl: '/public/report.jpg',
    height: 300,
    src: 'documents/report.pdf',
    width: 400,
  },
  () => '',
)

declare const Image: TransloaditImageComponent
declare const direct: TransloaditImageIntegration
declare const redirect: TransloaditRedirectImageIntegration
const model = createTransloaditImageModel(modelOptions, () => '')
const image = Image(imageProps)
const directImage = direct.Image(imageProps)
const redirectedImage = redirect.Image(imageProps)
const routeResponse = redirect.storageRoute(new Request('https://app.example/images'))
// @ts-expect-error Direct integrations do not expose an authorization route.
const missingRoute = direct.storageRoute
// @ts-expect-error Storage previews always use their signed JPEG fallback.
const imageWithFallback = <Image {...imageProps} fallbackSrc="/report.jpg" />
// @ts-expect-error Storage previews do not support viewport-conditional activation.
const imageWithMedia = <Image {...imageProps} media="(min-width: 768px)" />
// @ts-expect-error Storage-only sources are relative object paths, not discriminated objects.
const imageWithObjectSource = <Image {...imageProps} src={{ storage: 'documents/report.pdf' }} />

void directImage
void image
void imageWithFallback
void imageWithMedia
void imageWithObjectSource
void missingRoute
void model
void modelWithTuple
void redirectedImage
void routeResponse
