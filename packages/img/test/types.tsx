import type { TransloaditImageModelOptions, TransloaditImageSource } from '../src/index.ts'
import type {
  TransloaditImageComponent,
  TransloaditImageIntegration,
  TransloaditImageProps,
  TransloaditRedirectImageIntegration,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'
import { TransloaditPicture } from '../src/next/index.tsx'
import { createTransloaditImage, createTransloaditImageFromEnv } from '../src/next/server.tsx'

const modelOptions: TransloaditImageModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  formats: { avif: 45, webp: 75 },
  height: 300,
  src: 'documents/report.pdf',
  width: 400,
}

const imageProps = {
  alt: 'Preview of report.pdf',
  height: 300,
  src: 'documents/report.pdf',
  width: 400,
} satisfies TransloaditImageProps

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
const attributedImage = (
  <Image
    {...imageProps}
    id="report"
    title="Report"
    aria-describedby="caption"
    data-document="report"
    role="img"
  />
)
const eagerImage = <Image {...imageProps} loading="eager" preload />
const lazyImage = <Image {...imageProps} loading="lazy" preload={false} />
const receipt = {
  path: 'documents/report.pdf',
  width: 400,
  height: 300,
} satisfies TransloaditImageSource
const receiptImage = <Image alt="Receipt" src={receipt} preload />
const receiptRedirect = <redirect.Image alt="Receipt" src={receipt} loading="lazy" />
const receiptModel = createTransloaditImageModel(
  { expiresAt: modelOptions.expiresAt, src: receipt },
  () => '',
)
// @ts-expect-error A string source still requires its source dimensions.
const missingDimensions = <Image alt="Incomplete" src="documents/report.pdf" />
// @ts-expect-error Receipt geometry cannot be combined with separate dimensions.
const duplicateDimensions = <Image alt="Ambiguous" src={receipt} width={400} height={300} />
createTransloaditImageModel(
  // @ts-expect-error The neutral model has the same exclusive source geometry contract.
  { expiresAt: modelOptions.expiresAt, src: receipt, width: 400, height: 300 },
  () => '',
)
// @ts-expect-error A receipt does not weaken the lazy/preload union.
const lazyReceiptPreload = <Image alt="Receipt" src={receipt} loading="lazy" preload />
const receiptRedirectFallback = (
  // @ts-expect-error A receipt does not give redirect delivery a Suspense fallback.
  <redirect.Image alt="Receipt" src={receipt} suspenseFallback="Loading" />
)
// @ts-expect-error A preloaded image cannot be lazy.
const lazyPreload = <Image {...imageProps} loading="lazy" preload />
const lazyPicturePreload = (
  // @ts-expect-error The model-only renderer also rejects a lazy preload.
  <TransloaditPicture {...imageProps} model={model} loading="lazy" preload />
)
// @ts-expect-error A redirect image never suspends for signing.
const redirectFallback = <redirect.Image {...imageProps} suspenseFallback="Loading" />
// @ts-expect-error Event callbacks are not serializable image attributes.
const callbackImage = <Image {...imageProps} onLoad={() => undefined} />
// @ts-expect-error Candidate URLs belong to the configured image model.
const customSourceSet = <Image {...imageProps} srcSet="https://untrusted.example/a.jpg 320w" />
// @ts-expect-error Signing policy belongs to the server-only factory.
const perImageSecret = <Image {...imageProps} authSecret="secret" />
const configuredRedirect = createTransloaditImage({
  authKey: 'key',
  authSecret: 'secret',
  workspace: 'app',
  storage: { allowedPathPrefixes: [], delivery: { route: '/images', authorize: () => true } },
})
const configuredRedirectFallback = (
  // @ts-expect-error Factory overloads retain the redirect-specific component contract.
  <configuredRedirect.Image {...imageProps} suspenseFallback="Loading" />
)
const envDirect = createTransloaditImageFromEnv({
  storage: { allowedPathPrefixes: ['documents/'] },
})
// @ts-expect-error Callers must explicitly choose the allowed prefixes, including deny-all [].
createTransloaditImageFromEnv({ storage: {} })
const namedStorageImage = <envDirect.StorageImage alt="Receipt" src={receipt} loading="lazy" />
void namedStorageImage
const envRedirect = createTransloaditImageFromEnv({
  storage: {
    allowedPathPrefixes: ['documents/'],
    delivery: { route: '/images', authorize: () => true },
  },
})
const envImage = <envDirect.Image alt="Receipt" src={receipt} preload suspenseFallback="Loading" />
const envRedirectImage = <envRedirect.Image alt="Receipt" src={receipt} preload />
const envRoute = envRedirect.storageRoute(new Request('https://app.example/images'))
// @ts-expect-error The environment helper requires explicit Storage policy, not guessed access.
createTransloaditImageFromEnv({})
// @ts-expect-error Direct delivery does not expose an authorization route.
const envDirectRoute = envDirect.storageRoute
// @ts-expect-error The env factory preserves the lazy/preload union.
const envLazyPreload = <envDirect.Image alt="Receipt" src={receipt} loading="lazy" preload />
const envRedirectFallback = (
  // @ts-expect-error Redirect delivery has no signing suspension to replace.
  <envRedirect.Image alt="Receipt" src={receipt} suspenseFallback="Loading" />
)
// @ts-expect-error Direct integrations do not expose an authorization route.
const missingRoute = direct.storageRoute
// @ts-expect-error Storage previews always use their signed JPEG fallback.
const imageWithFallback = <Image {...imageProps} fallbackSrc="/report.jpg" />
// @ts-expect-error Storage previews do not support viewport-conditional activation.
const imageWithMedia = <Image {...imageProps} media="(min-width: 768px)" />
// @ts-expect-error An object source needs a path and source dimensions, not a storage discriminator.
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
void attributedImage
void eagerImage
void lazyImage
void lazyPreload
void lazyPicturePreload
void redirectFallback
void callbackImage
void customSourceSet
void perImageSecret
void configuredRedirectFallback
void receiptImage
void receiptRedirect
void receiptModel
void missingDimensions
void duplicateDimensions
void lazyReceiptPreload
void receiptRedirectFallback
void envImage
void envRedirectImage
void envRoute
void envDirectRoute
void envLazyPreload
void envRedirectFallback
