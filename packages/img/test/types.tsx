import type { TransloaditImageModelOptions, TransloaditImageSource } from '../src/index.ts'
import type {
  TransloaditImageComponent,
  TransloaditImageIntegration,
  TransloaditImageProps,
  TransloaditRedirectImageIntegration,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'
import { TransloaditPicture } from '../src/next/index.tsx'
import { createStorageImages } from '../src/next/server.tsx'

const modelOptions: TransloaditImageModelOptions = {
  expiresAt: Date.UTC(2030, 0, 1),
  fallbackBackground: '#ffffff',
  formats: { avif: 45, webp: 75 },
  height: 300,
  src: 'documents/report.pdf',
  width: 400,
}

const imageProps = {
  alt: 'Preview of report.pdf',
  fallbackBackground: '#224466',
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
const directImage = direct.StorageImage(imageProps)
const redirectedImage = redirect.StorageImage(imageProps)
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
const receiptRedirect = <redirect.StorageImage alt="Receipt" src={receipt} loading="lazy" />
const receiptModel = createTransloaditImageModel(
  { expiresAt: modelOptions.expiresAt, src: receipt },
  () => '',
)
// @ts-expect-error A string source still requires its source dimensions.
const missingDimensions = <Image alt="Incomplete" src="documents/report.pdf" />
const duplicateDimensions = <Image alt="Presentation box" src={receipt} width={400} height={300} />
createTransloaditImageModel(
  // @ts-expect-error The neutral model has the same exclusive source geometry contract.
  { expiresAt: modelOptions.expiresAt, src: receipt, width: 400, height: 300 },
  () => '',
)
// @ts-expect-error A receipt does not weaken the lazy/preload union.
const lazyReceiptPreload = <Image alt="Receipt" src={receipt} loading="lazy" preload />
const receiptRedirectFallback = (
  // @ts-expect-error A receipt does not give redirect delivery a Suspense fallback.
  <redirect.StorageImage alt="Receipt" src={receipt} suspenseFallback="Loading" />
)
// @ts-expect-error A preloaded image cannot be lazy.
const lazyPreload = <Image {...imageProps} loading="lazy" preload />
const lazyPicturePreload = (
  // @ts-expect-error The model-only renderer also rejects a lazy preload.
  <TransloaditPicture {...imageProps} model={model} loading="lazy" preload />
)
// @ts-expect-error A redirect image never suspends for signing.
const redirectFallback = <redirect.StorageImage {...imageProps} suspenseFallback="Loading" />
// @ts-expect-error Event callbacks are not serializable image attributes.
const callbackImage = <Image {...imageProps} onLoad={() => undefined} />
// @ts-expect-error Candidate URLs belong to the configured image model.
const customSourceSet = <Image {...imageProps} srcSet="https://untrusted.example/a.jpg 320w" />
// @ts-expect-error Signing policy belongs to the server-only factory.
const perImageSecret = <Image {...imageProps} authSecret="secret" />
const configuredRedirect = createStorageImages({
  authKey: 'key',
  authSecret: 'secret',
  workspace: 'app',
  allowedPathPrefixes: [],
  route: '/images',
  authorize: () => true,
})
const configuredRedirectFallback = (
  // @ts-expect-error Factory overloads retain the redirect-specific component contract.
  <configuredRedirect.StorageImage {...imageProps} suspenseFallback="Loading" />
)
const envDirect = createStorageImages({
  allowedPathPrefixes: ['documents/'],
  delivery: 'direct',
})
const images = {
  'website/hero.jpg': { path: 'website/hero.jpg', width: 2400, height: 1600 },
}
const catalog = createStorageImages({ images, public: ['website/'], lifetime: '365d' })
const catalogHero = (
  <catalog.StorageImage
    src="website/hero.jpg"
    alt="Hero"
    layout="constrained"
    maxWidth={960}
    preload
  />
)
const catalogAvatar = (
  <catalog.StorageImage src="website/hero.jpg" alt="Avatar" layout="fixed" width={48} height={48} />
)
const catalogFill = (
  <catalog.StorageImage
    src="website/hero.jpg"
    alt="Cover"
    layout="fill"
    fit="cover"
    aspectRatio="9/16"
  />
)
const catalogReceipt = <catalog.StorageImage src={receipt} alt="DB receipt" />
// @ts-expect-error Catalog references are exact keys, not unchecked paths.
const catalogTypo = <catalog.StorageImage src="website/heor.jpg" alt="Typo" />
const catalogUnknown = (
  // @ts-expect-error Explicit geometry does not bypass the catalog-key contract.
  <catalog.StorageImage src="website/other.jpg" alt="Other" width={100} height={100} />
)
const privateCatalog = createStorageImages({ images, authorize: () => true })
// @ts-expect-error The private factory retains the same exact catalog keys.
const privateTypo = <privateCatalog.StorageImage src="website/heor.jpg" alt="Typo" />
void [
  catalogHero,
  catalogAvatar,
  catalogFill,
  catalogReceipt,
  catalogTypo,
  catalogUnknown,
  privateTypo,
]
// @ts-expect-error Callers must explicitly choose the allowed prefixes, including deny-all [].
createStorageImages({})
const namedStorageImage = <envDirect.StorageImage alt="Receipt" src={receipt} loading="lazy" />
void namedStorageImage
const fixedImage = (
  <envDirect.StorageImage
    src={receipt}
    alt="Avatar"
    layout="fixed"
    width={48}
    height={48}
    fit="cover"
  />
)
const constrainedImage = (
  <envDirect.StorageImage src={receipt} alt="Hero" layout="constrained" maxWidth={960} />
)
const fillImage = (
  <envDirect.StorageImage
    src={receipt}
    alt="Cover"
    layout="fill"
    fit="cover"
    aspectRatio="9/16"
    sizes="100vw"
  />
)
const privateIntegration = createStorageImages({
  allowedPathPrefixes: ['documents/'],
  authorize: ({ path, request }) => path.endsWith('.pdf') && request.method === 'GET',
  lifetime: 60_000,
  public: ['documents/public/'],
})
const artDirectedImage = (
  <privateIntegration.StorageImage
    src={receipt}
    alt="Art direction"
    layout="fill"
    fit="cover"
    aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
    preload
  />
)
const incompleteArtDirection = (
  <Image
    src={receipt}
    alt="Missing default"
    layout="fill"
    fit="cover"
    // @ts-expect-error Every breakpoint map needs a default crop.
    aspectRatio={{ '(max-width: 639px)': '9/16' }}
  />
)
const nonCroppingArtDirection = (
  // @ts-expect-error Breakpoint crops require cover, not contain.
  <Image
    src={receipt}
    alt="Contain"
    layout="fill"
    fit="contain"
    aspectRatio={{ default: '16/9' }}
  />
)
// @ts-expect-error Only an authorize callback opts into a redirect handler.
void envDirect.storageRoute
// @ts-expect-error The unpublished Image alias was removed.
void envDirect.Image
void artDirectedImage
void incompleteArtDirection
void nonCroppingArtDirection
const incompleteFixed = (
  // @ts-expect-error Fixed layout needs both display-box dimensions.
  <envDirect.StorageImage src={receipt} alt="Avatar" layout="fixed" width={48} />
)
const incompleteConstrained = (
  // @ts-expect-error Constrained layout needs an explicit maximum display width.
  <envDirect.StorageImage src={receipt} alt="Hero" layout="constrained" />
)
void fixedImage
void constrainedImage
void fillImage
void incompleteFixed
void incompleteConstrained
const missingFillRatio = (
  // @ts-expect-error A fill crop needs the container ratio; it cannot be inferred from the source.
  <envDirect.StorageImage src={receipt} alt="Cover" layout="fill" fit="cover" />
)
const fixedString = (
  // @ts-expect-error Fixed width and height describe the box, so the source must carry its dimensions.
  <envDirect.StorageImage
    src="documents/report.pdf"
    alt="Cover"
    layout="fixed"
    width={48}
    height={48}
  />
)
void missingFillRatio
void fixedString
const envRedirect = createStorageImages({
  allowedPathPrefixes: ['documents/'],
  route: '/images',
  authorize: () => true,
})
const envImage = (
  <envDirect.StorageImage alt="Receipt" src={receipt} preload suspenseFallback="Loading" />
)
const envRedirectImage = <envRedirect.StorageImage alt="Receipt" src={receipt} preload />
const envRoute = envRedirect.storageRoute(new Request('https://app.example/images'))
// @ts-expect-error The environment helper requires explicit Storage policy, not guessed access.
createStorageImages({})
// @ts-expect-error Direct delivery does not expose an authorization route.
const envDirectRoute = envDirect.storageRoute
// @ts-expect-error The env factory preserves the lazy/preload union.
const envLazyPreload = <envDirect.StorageImage alt="Receipt" src={receipt} loading="lazy" preload />
const envRedirectFallback = (
  // @ts-expect-error Redirect delivery has no signing suspension to replace.
  <envRedirect.StorageImage alt="Receipt" src={receipt} suspenseFallback="Loading" />
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
