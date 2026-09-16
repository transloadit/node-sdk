import type { TransloaditImageModelOptions, TransloaditImageSource } from '../src/index.ts'
import type {
  TransloaditImageComponent,
  TransloaditImageIntegration,
  TransloaditImageProps,
  TransloaditRedirectImageIntegration,
} from '../src/next/server.tsx'

import { createTransloaditImageModel } from '../src/index.ts'
import { Image as ProjectImage, TransloaditPicture } from '../src/next/index.tsx'
import { createImages } from '../src/next/server.tsx'

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

const templateSuspense = (
  // @ts-expect-error Conventional Templates can use redirects; use an explicit direct factory for Suspense.
  <ProjectImage template="products" {...imageProps} suspenseFallback="Loading" />
)
void templateSuspense

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
// @ts-expect-error Images are immediately browser-discoverable; hydration deferral was removed.
const deferredImage = <Image {...imageProps} deferUntilHydrated />
const gatedPicture = (
  // @ts-expect-error Art direction is modeled with aspectRatio, not viewport activation props.
  <TransloaditPicture alt="" model={model} width={400} height={300} media="(min-width: 800px)" />
)
const placeholderPicture = (
  <TransloaditPicture
    alt=""
    model={model}
    width={400}
    height={300}
    // @ts-expect-error A removed media gate has no placeholder option.
    mediaPlaceholderSrc="/placeholder.gif"
  />
)
void deferredImage
void gatedPicture
void placeholderPicture
const image = Image(imageProps)
const directImage = direct.Image(imageProps)
const redirectedImage = redirect.Image(imageProps)
const routeResponse = redirect.imageRoute(new Request('https://app.example/images'))
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
const eagerImage = <Image {...imageProps} loading="eager" priority />
const preloadedImage = <Image {...imageProps} preload />
// @ts-expect-error A preloaded image cannot also be lazy.
const lazyPreloadedImage = <Image {...imageProps} loading="lazy" preload />
void preloadedImage
void lazyPreloadedImage
const lazyImage = <Image {...imageProps} loading="lazy" priority={false} />
const receipt = {
  path: 'documents/report.pdf',
  width: 400,
  height: 300,
} satisfies TransloaditImageSource
const receiptImage = <Image alt="Receipt" src={receipt} priority />
const receiptRedirect = <redirect.Image alt="Receipt" src={receipt} loading="lazy" />
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
const lazyReceiptPreload = <Image alt="Receipt" src={receipt} loading="lazy" priority />
const receiptRedirectFallback = (
  // @ts-expect-error A receipt does not give redirect delivery a Suspense fallback.
  <redirect.Image alt="Receipt" src={receipt} suspenseFallback="Loading" />
)
// @ts-expect-error A preloaded image cannot be lazy.
const lazyPreload = <Image {...imageProps} loading="lazy" priority />
const lazyPicturePreload = (
  // @ts-expect-error The model-only renderer also rejects a lazy preload.
  <TransloaditPicture {...imageProps} model={model} loading="lazy" priority />
)
// @ts-expect-error A redirect image never suspends for signing.
const redirectFallback = <redirect.Image {...imageProps} suspenseFallback="Loading" />
// @ts-expect-error Event callbacks are not serializable image attributes.
const callbackImage = <Image {...imageProps} onLoad={() => undefined} />
// @ts-expect-error Candidate URLs belong to the configured image model.
const customSourceSet = <Image {...imageProps} srcSet="https://untrusted.example/a.jpg 320w" />
// @ts-expect-error Signing policy belongs to the server-only factory.
const perImageSecret = <Image {...imageProps} authSecret="secret" />
const configuredRedirect = createImages({
  authKey: 'key',
  authSecret: 'secret',
  workspace: 'app',
  allowedPathPrefixes: [],
  route: '/images',
  authorize: () => true,
})
const configuredRedirectFallback = (
  // @ts-expect-error Factory overloads retain the redirect-specific component contract.
  <configuredRedirect.Image {...imageProps} suspenseFallback="Loading" />
)
const envDirect = createImages({
  allowedPathPrefixes: ['documents/'],
  delivery: 'direct',
})
const images = {
  'website/hero.jpg': { path: 'website/hero.jpg', width: 2400, height: 1600 },
}
const catalog = createImages({ images, public: ['website/'] })
const catalogHero = (
  <catalog.Image src="website/hero.jpg" alt="Hero" layout="constrained" width={960} priority />
)
const catalogAvatar = (
  <catalog.Image src="website/hero.jpg" alt="Avatar" layout="fixed" width={48} height={48} />
)
const catalogFill = (
  <catalog.Image src="website/hero.jpg" alt="Cover" layout="fill" fit="cover" aspectRatio="9/16" />
)
const catalogReceipt = <catalog.Image src={receipt} alt="DB receipt" />
// @ts-expect-error Catalog references are exact keys, not unchecked paths.
const catalogTypo = <catalog.Image src="website/heor.jpg" alt="Typo" />
const catalogUnknown = (
  // @ts-expect-error Explicit geometry does not bypass the catalog-key contract.
  <catalog.Image src="website/other.jpg" alt="Other" width={100} height={100} />
)
const privateCatalog = createImages({ images, authorize: () => true })
// @ts-expect-error The private factory retains the same exact catalog keys.
const privateTypo = <privateCatalog.Image src="website/heor.jpg" alt="Typo" />
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
createImages({})
const namedStorageImage = <envDirect.Image alt="Receipt" src={receipt} loading="lazy" />
void namedStorageImage
const fixedImage = (
  <envDirect.Image src={receipt} alt="Avatar" layout="fixed" width={48} height={48} fit="cover" />
)
const constrainedImage = (
  <envDirect.Image src={receipt} alt="Hero" layout="constrained" width={960} />
)
const fillImage = (
  <envDirect.Image
    src={receipt}
    alt="Cover"
    layout="fill"
    fit="cover"
    aspectRatio="9/16"
    sizes="100vw"
  />
)
const privateIntegration = createImages({
  allowedPathPrefixes: ['documents/'],
  authorize: ({ path, request }) => path.endsWith('.pdf') && request.method === 'GET',
  lifetime: 60_000,
  public: ['documents/public/'],
})
const artDirectedImage = (
  <privateIntegration.Image
    src={receipt}
    alt="Art direction"
    layout="fill"
    fit="cover"
    aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
    priority
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
void envDirect.imageRoute
// A configured factory returns the same renderer name as the package-first API.
void envDirect.Image
void artDirectedImage
void incompleteArtDirection
void nonCroppingArtDirection
const incompleteFixed = (
  // @ts-expect-error Fixed layout needs both display-box dimensions.
  <envDirect.Image src={receipt} alt="Avatar" layout="fixed" width={48} />
)
const incompleteConstrained = <envDirect.Image src={receipt} alt="Hero" layout="constrained" />
void fixedImage
void constrainedImage
void fillImage
void incompleteFixed
void incompleteConstrained
const missingFillRatio = (
  // @ts-expect-error A fill crop needs the container ratio; it cannot be inferred from the source.
  <envDirect.Image src={receipt} alt="Cover" layout="fill" fit="cover" />
)
const fixedString = (
  // @ts-expect-error Fixed width and height describe the box, so the source must carry its dimensions.
  <envDirect.Image src="documents/report.pdf" alt="Cover" layout="fixed" width={48} height={48} />
)
void missingFillRatio
void fixedString
const envRedirect = createImages({
  allowedPathPrefixes: ['documents/'],
  route: '/images',
  authorize: () => true,
})
const envImage = <envDirect.Image alt="Receipt" src={receipt} priority suspenseFallback="Loading" />
const envRedirectImage = <envRedirect.Image alt="Receipt" src={receipt} priority />
const envRoute = envRedirect.imageRoute(new Request('https://app.example/images'))
// @ts-expect-error The environment helper requires explicit Storage policy, not guessed access.
createImages({})
// @ts-expect-error Direct delivery does not expose an authorization route.
const envDirectRoute = envDirect.imageRoute
const envLazyPreload = (
  // @ts-expect-error The env factory preserves the lazy/priority union.
  <envDirect.Image alt="Receipt" src={receipt} loading="lazy" priority />
)
const envRedirectFallback = (
  // @ts-expect-error Redirect delivery has no signing suspension to replace.
  <envRedirect.Image alt="Receipt" src={receipt} suspenseFallback="Loading" />
)
// @ts-expect-error Direct integrations do not expose an authorization route.
const missingRoute = direct.imageRoute
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
