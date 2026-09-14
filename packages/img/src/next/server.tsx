import 'server-only'

import type { SmartCdnUrlParams } from '@transloadit/utils/node'
import type { ReactNode } from 'react'

import type {
  SmartCdnImageSignRequest,
  StoragePreviewFormats,
  TransloaditImageModel,
} from '../index.ts'
import type { DiagnoseStorageImage } from './diagnostics.ts'
import type { TransloaditImageLayoutProps, TransloaditImagePresentationProps } from './index.tsx'
import type { StorageImageCatalog, StorageImageLayoutProps } from './layout.ts'

import { createHash, hkdfSync } from 'node:crypto'

import { gcmsiv } from '@noble/ciphers/aes.js'
import { validateStoragePath, validateStoragePathPrefix } from '@transloadit/utils'
import { getSignedSmartCdnUrl, getSmartCdnUrl } from '@transloadit/utils/node'
import { connection } from 'next/server.js'
import { Suspense, use } from 'react'
import { thumbHashToDataURL } from 'thumbhash'

import { isOpaqueImageBackground, transparentImageBackground } from '../imageBackground.ts'
import { snapshotImageSource } from '../imageSource.ts'
import {
  createTransloaditImageModel,
  transloaditPublicStoragePreviewTemplate,
  transloaditStoragePreviewTemplate,
} from '../index.ts'
import { createImageDiagnostics } from './diagnostics.ts'
import { ImageSizeDiagnostics } from './ImageSizeDiagnostics.tsx'
import { snapshotImageAttributes, snapshotImageLoading } from './imageAttributes.ts'
import { TransloaditPicture } from './index.tsx'
import { resolveImageLayout } from './layout.ts'
import { publishImageHint } from './pathHints.ts'

const defaultStorageExpiresInMs = 60 * 60 * 1000
const imagePolicyParams = new Set(['auth_key', 'bg', 'exp', 'f', 'h', 'q', 'r', 'sig', 'v', 'w'])
const maximumImageDimension = 8000
const maximumStorageLifetimeMs = 48 * 60 * 60 * 1000
const storageCapabilityAuthenticationBytes = 16
const storageCapabilityMaximumLength = 4096
const storageCapabilityMinimumBytes = storageCapabilityAuthenticationBytes + 1
const storageCapabilityPattern = /^[A-Za-z0-9_-]+$/
const storageCapabilityVersion = 1
const storageRouteKeyDomain = '@transloadit/img/storage-route/v1'

/** Values available to application authorization before a Storage redirect is issued. */
export interface TransloaditStorageAuthorizationContext {
  path: string
  request: Request
}

/** Return true to authorize one private object; thrown application errors propagate, not deny. */
export type AuthorizeTransloaditStorageImage = (
  context: TransloaditStorageAuthorizationContext,
) => boolean | Promise<boolean>

/** Request-authorized, byte-pass-through-free Storage delivery through a local route. */
export interface TransloaditStorageRedirectDelivery {
  authorize: AuthorizeTransloaditStorageImage
  /** Server-declared public directories: use unsigned, direct CDN delivery. */
  public?: readonly string[]
  /** Next.js `basePath` prepended only to browser-facing route URLs. */
  basePath?: string
  /** Opt-in browser caching; capped at the rotation interval. Delays reauthorization. */
  cacheMaxAgeMs?: number
  /** Internal App Router path that exports `storageRoute`, for example `/api/private-images`. */
  route: string
}

/** A maximum grant age, in milliseconds or an explicit duration such as "1h" or "365d". */
export type StorageImageLifetime = number | `${number}${'ms' | 's' | 'm' | 'h' | 'd'}`

interface StorageImageOptions<Catalog extends StorageImageCatalog | undefined = undefined> {
  /** Trusted key override; otherwise resolved from the server environment on first use. */
  authKey?: string
  /** Trusted secret override; otherwise resolved from the server environment on first use. */
  authSecret?: string
  /** Catalog/explicit workspace fallback; TRANSLOADIT_WORKSPACE overrides it on first use. */
  workspace?: string
  /** Catalog transport overrides, or direct signing inside a request-authorized page. */
  delivery?: 'direct' | { baseUrl?: string; urlParams?: SmartCdnUrlParams }
  /** Catalog keys become typed src references; values provide intrinsic geometry. */
  images?: Catalog
  /** Defaults to public and catalog directories, plus exact root-level catalog paths. */
  allowedPathPrefixes?: readonly string[]
  /** Explicitly allow every object in the workspace, including root-level paths. */
  allowWorkspaceRoot?: boolean
  /** Server-declared public directories. These render unsigned URLs without keys or expiry. */
  public?: readonly string[]
  /** Opt into a redirect handler; private objects require this check for every uncached request. */
  authorize?: AuthorizeTransloaditStorageImage
  /** Defaults to /api/storage-images when authorize is provided. */
  route?: string
  basePath?: string
  /** Opt-in private browser caching, capped at rotation and remaining grant age. */
  cacheMaxAge?: StorageImageLifetime
  /** @deprecated Use cacheMaxAge with a duration such as '1m'. */
  cacheMaxAgeMs?: number
  /** Maximum private CDN grant age, at most 48h; defaults to 1h. Public URLs never expire. */
  lifetime?: StorageImageLifetime
  /** Stable signature bucket, at most half the private lifetime. Defaults to min(lifetime / 2, one hour). */
  rotationInterval?: StorageImageLifetime
  /** @deprecated Use rotationInterval with a duration such as '30m'. */
  rotationIntervalMs?: number
  /** Trusted development endpoint override; never derive this from request data. */
  baseUrl?: string
  /** Trusted compatible signed Template override for Storage previews. */
  template?: string
  /** Trusted unsigned public Template override; independent of the private Template. */
  publicTemplate?: string
  /** Trusted transport parameters appended to every signed URL, such as `cdn=required`. */
  urlParams?: SmartCdnUrlParams
}

/** One flat policy with either a catalog, explicit prefixes (including deny-all []), or root access. */
export type StorageImagesConfiguration<
  Catalog extends StorageImageCatalog | undefined = undefined,
> = StorageImageOptions<Catalog> &
  (
    | { images: Catalog extends undefined ? never : Catalog }
    | { allowedPathPrefixes: readonly string[] }
    | { allowWorkspaceRoot: true }
  )

/** Request-authorized private delivery with the same flat configuration as direct delivery. */
export type PrivateStorageImagesConfiguration<
  Catalog extends StorageImageCatalog | undefined = undefined,
> = StorageImagesConfiguration<Catalog> & {
  authorize: AuthorizeTransloaditStorageImage
}

/** Props for a Transloadit Storage preview, optionally typed from a rendering catalog. */
export type TransloaditImageProps<Catalog extends StorageImageCatalog | undefined = undefined> =
  TransloaditImageLayoutProps &
    StorageImageLayoutProps<Catalog> & {
      /** Opaque JPEG background as #rrggbb or #rrggbbff. Defaults to white. */
      fallbackBackground?: string
      /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
      fallbackQuality?: number
      formats?: StoragePreviewFormats
      /** Opt-in receipt blur; request-authorized private redirects do not expose placeholder pixels. */
      placeholder?: 'blur' | 'empty'
      /** Static shell used only while direct request-time signing is suspended. */
      suspenseFallback?: ReactNode
      /** Advanced candidate override. Defaults to a conservative ladder capped at `width`. */
      widths?: readonly number[]
    }

/** Redirect images render synchronously and have no signing suspension to replace. */
export type TransloaditRedirectImageProps<
  Catalog extends StorageImageCatalog | undefined = undefined,
> = TransloaditImageProps<Catalog> & { suspenseFallback?: never }

/** One configured Next.js Server Component for Transloadit Storage objects. */
export type TransloaditImageComponent<Catalog extends StorageImageCatalog | undefined = undefined> =
  (props: TransloaditImageProps<Catalog>) => ReactNode

/** A Next.js route handler that authorizes and redirects one private image request. */
export type TransloaditStorageRoute = (request: Request) => Promise<Response>

/** Direct-delivery integration. Image bytes and requests bypass the Next.js server. */
export interface TransloaditImageIntegration<
  Catalog extends StorageImageCatalog | undefined = undefined,
> {
  StorageImage: TransloaditImageComponent<Catalog>
}

/** Redirect-delivery integration with a route handler for private Storage images. */
export interface TransloaditRedirectImageIntegration<
  Catalog extends StorageImageCatalog | undefined = undefined,
> {
  StorageImage: (props: TransloaditRedirectImageProps<Catalog>) => ReactNode
  storageRoute: TransloaditStorageRoute
}

interface ResolvedStoragePolicy {
  allowedPathPrefixes: readonly string[]
  allowedPaths: ReadonlySet<string>
  delivery: 'direct' | TransloaditStorageRedirectDelivery
  images?: StorageImageCatalog
  lifetime?: number
  public: readonly string[]
  rotationIntervalMs?: number
}

interface ResolvedStorageCapabilityPolicy {
  context: string
  delivery: TransloaditStorageRedirectDelivery
  key: Buffer
}

interface StorageImageTransform {
  background?: string
  format: 'avif' | 'jpg' | 'png' | 'webp'
  height: number
  path: string
  quality: number
  strategy?: 'fillcrop'
  width: number
}

interface TransloaditStorageImageRequestProps {
  props: ResolvedStorageImageProps
}

type ResolvedStorageImageProps = TransloaditImagePresentationProps & {
  source: ReturnType<typeof resolveImageLayout>['source']
  cropAspectRatio?: number
  artDirection?: ReturnType<typeof resolveImageLayout>['artDirection']
  frame?: ReturnType<typeof resolveImageLayout>['frame']
  diagnoseSize?: boolean
  fallbackWidth?: number
  maximumWidth?: number
  fallbackBackground?: string
  fallbackQuality?: number
  formats?: StoragePreviewFormats
  placeholder?: 'blur' | 'empty'
  suspenseFallback?: ReactNode
  widths?: readonly number[]
}

function StorageImagePlaceholder({ props }: TransloaditStorageImageRequestProps): ReactNode {
  const attributes = snapshotImageAttributes(props)
  // Streaming briefly keeps both elements in the DOM; identity and accessibility belong to the
  // resolved image, not to the decorative shell that React will remove.
  const placeholderAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([name]) => name !== 'id' && !name.startsWith('aria-')),
  )
  return (
    <StorageImageFrame props={props}>
      <picture>
        <img
          {...placeholderAttributes}
          alt=""
          aria-hidden="true"
          inert
          sizes={undefined}
          style={{ ...attributes.style, visibility: 'hidden' }}
        />
      </picture>
    </StorageImageFrame>
  )
}

function validateRequiredConfiguration(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value === '' || value.trim() !== value) {
    throw new TypeError(`${name} must be a non-empty string without surrounding whitespace`)
  }
}

function validateDuration(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

function validateBaseUrl(baseUrl: string | undefined): void {
  if (baseUrl === undefined) return
  const error = new TypeError(
    'baseUrl must be an absolute HTTP(S) URL without credentials, a query string, or a fragment',
  )
  if (typeof baseUrl !== 'string' || baseUrl === '' || baseUrl.trim() !== baseUrl) throw error
  let parsed: URL
  try {
    parsed = new URL(baseUrl.replaceAll('{workspace}', 'workspace'))
  } catch {
    throw error
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw error
  }
}

function validateTemplate(template: string | undefined, name: string): void {
  if (template === undefined) return
  if (typeof template !== 'string' || template === '' || template.trim() !== template) {
    throw new TypeError(`${name} must be a non-empty string without surrounding whitespace`)
  }
}

function validateGlobalUrlParams(urlParams: SmartCdnUrlParams | undefined): void {
  for (const parameter of Object.keys(urlParams ?? {})) {
    if (imagePolicyParams.has(parameter)) {
      throw new TypeError(`urlParams must not override image policy parameter: ${parameter}`)
    }
  }
}

function validateStorageRoute(route: string): void {
  const error = new TypeError('route must be one absolute application path')
  if (
    typeof route !== 'string' ||
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.length > 1024
  ) {
    throw error
  }
  const parsed = new URL(route, 'https://transloadit.invalid')
  if (parsed.origin !== 'https://transloadit.invalid' || parsed.pathname !== route) throw error
}

function validateStorageBasePath(basePath: string | undefined): void {
  if (basePath === undefined) return
  const error = new TypeError('basePath must be one absolute path without a trailing slash')
  if (
    typeof basePath !== 'string' ||
    basePath === '' ||
    basePath === '/' ||
    !basePath.startsWith('/') ||
    basePath.startsWith('//') ||
    basePath.endsWith('/') ||
    basePath.length > 1024
  ) {
    throw error
  }
  const parsed = new URL(basePath, 'https://transloadit.invalid')
  if (parsed.origin !== 'https://transloadit.invalid' || parsed.pathname !== basePath) throw error
}

function getBrowserStorageRoute(delivery: TransloaditStorageRedirectDelivery): string {
  return `${delivery.basePath ?? ''}${delivery.route}`
}

function removeTrailingSlash(path: string): string {
  return path === '/' || !path.endsWith('/') ? path : path.slice(0, -1)
}

function matchesStorageRoute(path: string, delivery: TransloaditStorageRedirectDelivery): boolean {
  const normalized = removeTrailingSlash(path)
  return (
    normalized === removeTrailingSlash(delivery.route) ||
    normalized === removeTrailingSlash(getBrowserStorageRoute(delivery))
  )
}

function parseLifetime(
  lifetime: StorageImageLifetime | undefined,
  name = 'lifetime',
): number | undefined {
  if (lifetime === undefined) return undefined
  const units = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  if (typeof lifetime === 'number') {
    validateDuration(lifetime, name)
    return lifetime
  }
  if (typeof lifetime !== 'string')
    throw new TypeError(`${name} must be milliseconds or a duration such as "1h"`)
  const parts = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/.exec(lifetime)
  const unit = parts?.[2]
  if (parts === null || unit === undefined || !(unit in units))
    throw new TypeError(`${name} must be milliseconds or a duration such as "1h"`)
  const multiplier = Object.entries(units).find(([name]) => name === unit)?.[1]
  if (multiplier === undefined) throw new TypeError('Unsupported lifetime unit')
  const duration = Number(parts[1]) * multiplier
  validateDuration(duration, name)
  return duration
}

function validatePrefixes(prefixes: readonly string[], name: string): readonly string[] {
  if (!Array.isArray(prefixes)) throw new TypeError(`${name} must be an array of explicit prefixes`)
  for (const [index, prefix] of prefixes.entries()) {
    validateStoragePathPrefix(prefix, index, name)
    if (prefix === '')
      throw new TypeError(
        `${name} cannot contain an empty prefix; use allowWorkspaceRoot: true for workspace-wide access`,
      )
  }
  return [...new Set(prefixes)]
}

function getStoragePolicy(
  configuration: StorageImagesConfiguration<StorageImageCatalog | undefined>,
): ResolvedStoragePolicy {
  if (typeof configuration !== 'object' || configuration === null || Array.isArray(configuration)) {
    throw new TypeError('Storage images require an explicit configuration object')
  }
  const catalog = configuration.images
  let images: StorageImageCatalog | undefined
  if (catalog !== undefined) {
    if (!isRecord(catalog)) throw new TypeError('images must be a rendering catalog')
    images = Object.fromEntries(
      Object.entries(catalog).map(([path, source]) => {
        const receipt = snapshotImageSource({ src: source })
        if (path !== receipt.path)
          throw new TypeError('Each catalog key must equal its receipt path')
        return [path, receipt]
      }),
    )
  }
  if (
    configuration.allowWorkspaceRoot !== undefined &&
    typeof configuration.allowWorkspaceRoot !== 'boolean'
  )
    throw new TypeError('allowWorkspaceRoot must be a boolean')
  if (
    configuration.allowedPathPrefixes === undefined &&
    images === undefined &&
    configuration.allowWorkspaceRoot !== true
  )
    throw new TypeError('images, allowedPathPrefixes or allowWorkspaceRoot: true is required')
  const inferredPrefixes = new Set<string>()
  const allowedPaths = new Set<string>()
  if (configuration.allowedPathPrefixes === undefined) {
    for (const path of Object.keys(images ?? {})) {
      const separator = path.lastIndexOf('/')
      if (separator === -1) allowedPaths.add(path)
      else inferredPrefixes.add(path.slice(0, separator + 1))
    }
  }
  const publicPrefixes = validatePrefixes(configuration.public ?? [], 'public')
  const allowedPathPrefixes = validatePrefixes(
    configuration.allowedPathPrefixes ?? [...inferredPrefixes, ...publicPrefixes],
    'allowedPathPrefixes',
  )
  const resolvedPrefixes = configuration.allowWorkspaceRoot === true ? [''] : allowedPathPrefixes
  for (const prefix of publicPrefixes) {
    if (new TextEncoder().encode(prefix).byteLength > 512)
      throw new TypeError('public prefixes must not exceed 512 UTF-8 bytes')
    if (!resolvedPrefixes.some((allowed) => prefix.startsWith(allowed)))
      throw new TypeError('public prefixes must be within allowedPathPrefixes')
  }
  if (
    configuration.authorize === undefined &&
    publicPrefixes.length === 0 &&
    configuration.delivery !== 'direct'
  )
    throw new TypeError(
      "No public prefixes are configured. Publish a directory with storage publish only if it should be public; otherwise configure private authorization. Choose public, authorize, or delivery: 'direct' for Storage images.",
    )
  if (configuration.delivery !== undefined && configuration.delivery !== 'direct')
    throw new TypeError("delivery must be 'direct'; provide authorize to enable redirects")
  const lifetime = parseLifetime(configuration.lifetime)
  if (lifetime !== undefined && lifetime > maximumStorageLifetimeMs)
    throw new RangeError(
      'Private Storage image lifetime must not exceed 48 hours; public URLs do not use lifetime',
    )
  if (
    configuration.rotationInterval !== undefined &&
    configuration.rotationIntervalMs !== undefined
  )
    throw new TypeError('Use rotationInterval or rotationIntervalMs, not both')
  if (configuration.cacheMaxAge !== undefined && configuration.cacheMaxAgeMs !== undefined)
    throw new TypeError('Use cacheMaxAge or cacheMaxAgeMs, not both')
  const rotationIntervalMs = parseLifetime(
    configuration.rotationInterval ?? configuration.rotationIntervalMs,
    'rotationInterval',
  )
  const cacheMaxAgeMs = parseLifetime(
    configuration.cacheMaxAge ?? configuration.cacheMaxAgeMs,
    'cacheMaxAge',
  )
  if (rotationIntervalMs !== undefined) {
    validateDuration(rotationIntervalMs, 'rotationIntervalMs')
    if (
      rotationIntervalMs >
      Math.min(lifetime ?? defaultStorageExpiresInMs, maximumStorageLifetimeMs) / 2
    )
      throw new RangeError(
        'rotationIntervalMs must not exceed half the private lifetime (capped at 48 hours)',
      )
  }
  const basePath = configuration.authorize !== undefined ? configuration.basePath : undefined
  let delivery: ResolvedStoragePolicy['delivery'] = 'direct'
  if (configuration.authorize !== undefined) {
    // An authorizer overrides a shared direct-delivery default; private access stays gated.
    const route = configuration.route ?? '/api/storage-images'
    validateStorageRoute(route)
    validateStorageBasePath(basePath)
    if (typeof configuration.authorize !== 'function') {
      throw new TypeError('authorize must be a function')
    }
    delivery = {
      authorize: configuration.authorize,
      basePath,
      cacheMaxAgeMs,
      public: publicPrefixes,
      route,
    }
  } else if (
    configuration.route !== undefined ||
    configuration.basePath !== undefined ||
    cacheMaxAgeMs !== undefined
  ) {
    throw new TypeError('route, basePath and cacheMaxAgeMs require an authorize function')
  }
  return {
    allowedPathPrefixes: resolvedPrefixes,
    allowedPaths,
    delivery,
    images,
    lifetime,
    public: publicPrefixes,
    rotationIntervalMs,
  }
}

function getGrantPolicy(policy: ResolvedStoragePolicy): { lifetime: number; rotation: number } {
  const lifetime = policy.lifetime ?? defaultStorageExpiresInMs
  const rotation =
    policy.rotationIntervalMs ??
    Math.max(1, Math.min(Math.floor(lifetime / 2), defaultStorageExpiresInMs))
  return { lifetime, rotation }
}

function getStorageExpiresAt(now: number, policy: ResolvedStoragePolicy): number {
  const { lifetime, rotation } = getGrantPolicy(policy)
  return Math.floor(now / rotation) * rotation + lifetime
}

function assertAllowedStoragePath(path: string, policy: ResolvedStoragePolicy): void {
  validateStoragePath(path)
  if (
    !policy.allowedPaths.has(path) &&
    !policy.allowedPathPrefixes.some((prefix) => path.startsWith(prefix))
  ) {
    throw new TypeError('Storage image path is outside the configured allowed prefixes')
  }
}

function snapshotUrlParams(
  urlParams: SmartCdnUrlParams | undefined,
): SmartCdnUrlParams | undefined {
  if (urlParams === undefined) return undefined
  const snapshot: SmartCdnUrlParams = {}
  for (const [key, value] of Object.entries(urlParams)) {
    snapshot[key] = Array.isArray(value) ? [...value] : value
  }
  return snapshot
}

function previewUrlParams(template: string, parameters: SmartCdnUrlParams): SmartCdnUrlParams {
  // These exact versions share API2's defaults. Customer templates (and future Built-ins) may not.
  if (template !== 'builtin/storage-preview@0.0.2' && template !== 'builtin/public-preview@0.0.1')
    return parameters
  const defaults: Readonly<Record<string, string | number>> = {
    bg: '#ffffff',
    f: 'jpg',
    q: 75,
    r: 'pad',
  }
  return Object.fromEntries(
    Object.entries(parameters).filter(
      ([name, value]) => !Object.hasOwn(defaults, name) || defaults[name] !== value,
    ),
  )
}

function snapshotStorageImageProps(
  props: TransloaditImageProps<StorageImageCatalog>,
  layout: ReturnType<typeof resolveImageLayout>,
): ResolvedStorageImageProps {
  const attributes = snapshotImageAttributes(props)
  const loading = snapshotImageLoading(props)
  const lazy = loading.loading !== 'eager' && loading.preload !== true
  return {
    ...attributes,
    ...loading,
    artDirection: layout.artDirection,
    frame: layout.frame,
    diagnoseSize: process.env.NODE_ENV === 'development' && props.sizes === undefined,
    cropAspectRatio: layout.cropAspectRatio,
    errorFallback: props.errorFallback,
    retryKey: props.retryKey,
    fallbackBackground: props.fallbackBackground,
    fallbackQuality: props.fallbackQuality,
    fallbackWidth: layout.fallbackWidth,
    formats: props.formats === undefined ? undefined : { ...props.formats },
    height: layout.height,
    maximumWidth: layout.maximumWidth,
    objectFit: props.objectFit,
    placeholder: props.placeholder,
    source: layout.source,
    sizes:
      attributes.sizes ??
      ((props.layout === undefined || props.layout === 'constrained') &&
      lazy &&
      layout.sizes !== undefined
        ? `auto, ${layout.sizes}`
        : layout.sizes),
    style: { ...layout.style, ...attributes.style },
    suspenseFallback: props.suspenseFallback,
    width: layout.width,
    widths: layout.widths,
  }
}

interface DevelopmentDeliveryResultProps {
  result: Promise<string>
}

function DevelopmentDeliveryResult({ result }: DevelopmentDeliveryResultProps): ReactNode {
  return <span>{use(result)}. See the terminal for details.</span>
}

function renderPicture(
  props: ResolvedStorageImageProps,
  model: Parameters<typeof TransloaditPicture>[0]['model'],
  diagnostic?: Promise<string>,
  inlinePixels = false,
): ReactNode {
  let blurDataURL: string | undefined
  if (props.placeholder === 'blur') {
    const hash = props.source.thumbhash
    // Receipt metadata can be hand-edited. Bound decoding and reject malformed base64/geometry.
    const bytes =
      typeof hash === 'string' && hash.length <= 48 && /^[A-Za-z0-9+/]+={0,2}$/.test(hash)
        ? Buffer.from(hash, 'base64')
        : undefined
    if (
      inlinePixels &&
      bytes !== undefined &&
      bytes.length >= 17 &&
      bytes.length <= 25 &&
      bytes.toString('base64') === hash &&
      ((bytes[3] ?? 0) & 7) > 0
    ) {
      blurDataURL = thumbHashToDataURL(bytes)
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(
        inlinePixels
          ? `[StorageImage] ${JSON.stringify(props.source.path)} has no usable thumbhash; placeholder="blur" is a no-op. Use storage store with the original bytes to generate it.`
          : `[StorageImage] ${JSON.stringify(props.source.path)} uses request-authorized private delivery; placeholder="blur" is a no-op so its pixels are not exposed before authorization.`,
      )
    }
  }
  const errorFallback =
    props.errorFallback === undefined || process.env.NODE_ENV !== 'development' ? (
      props.errorFallback
    ) : (
      <>
        {props.errorFallback}
        {diagnostic === undefined ? (
          <span>See the terminal for details.</span>
        ) : (
          <Suspense fallback={<span>Checking delivery; see the terminal for details.</span>}>
            <DevelopmentDeliveryResult result={diagnostic} />
          </Suspense>
        )}
      </>
    )
  const picture = (
    <StorageImageFrame props={props}>
      <TransloaditPicture
        {...props}
        model={model}
        errorFallback={errorFallback}
        blurDataURL={blurDataURL}
      />
    </StorageImageFrame>
  )
  return props.diagnoseSize ? <ImageSizeDiagnostics>{picture}</ImageSizeDiagnostics> : picture
}

interface StorageImageFrameProps {
  props: ResolvedStorageImageProps
  children: ReactNode
}

function StorageImageFrame({ props, children }: StorageImageFrameProps): ReactNode {
  const frame = props.frame
  if (frame === undefined) return children
  // Values are validated numeric ratios/width queries, never arbitrary caller CSS. Reverse the
  // rules so overlapping breakpoints follow picture's first-matching-source precedence.
  const name = `tli-${createHash('sha256').update(JSON.stringify(frame)).digest('hex').slice(0, 16)}`
  const selector = `.${name}`
  const css = `${selector}{display:block;position:relative;width:100%;aspect-ratio:${frame.ratio}}${[
    ...frame.variants,
  ]
    .reverse()
    .map(
      ({ media, cropAspectRatio }) =>
        `@media ${media}{${selector}{aspect-ratio:${cropAspectRatio}}}`,
    )
    .join('')}`
  return (
    <>
      <style nonce={props.nonce}>{css}</style>
      <span className={name}>{children}</span>
    </>
  )
}

function getStorageTransform(
  request: Omit<SmartCdnImageSignRequest, 'expiresAt'>,
): StorageImageTransform {
  const {
    bg: background,
    f: format,
    h: height,
    q: quality,
    r: strategy,
    w: width,
  } = request.urlParams
  if (
    (format !== 'avif' && format !== 'jpg' && format !== 'png' && format !== 'webp') ||
    typeof background !== 'string' ||
    typeof height !== 'number' ||
    typeof quality !== 'number' ||
    (strategy !== 'pad' && strategy !== 'fillcrop') ||
    typeof width !== 'number'
  ) {
    throw new TypeError('Storage image model produced an unsupported transform')
  }
  return {
    background,
    format,
    height,
    path: request.input,
    quality,
    width,
    ...(strategy === 'fillcrop' ? { strategy } : {}),
  }
}

function createStorageRouteKey(authSecret: string, workspace: string): Buffer {
  return Buffer.from(hkdfSync('sha256', authSecret, storageRouteKeyDomain, workspace, 32))
}

function getStorageCapabilityContext(
  delivery: TransloaditStorageRedirectDelivery,
  customTemplate: string | undefined,
  workspace: string,
): string {
  return JSON.stringify([
    storageRouteKeyDomain,
    storageCapabilityVersion,
    workspace,
    customTemplate ?? null,
    delivery.route,
    getBrowserStorageRoute(delivery),
  ])
}

function encryptStorageCapability(
  context: string,
  key: Buffer,
  transform: StorageImageTransform,
): string {
  // GCM-SIV safely tolerates nonce reuse. A fixed nonce keeps prerendered URLs deterministic while
  // revealing only whether two capabilities protect the same path and transform under one policy.
  const cipher = gcmsiv(key, new Uint8Array(12), Buffer.from(context))
  const plaintext = Buffer.from(JSON.stringify({ ...transform, version: storageCapabilityVersion }))
  return Buffer.from(cipher.encrypt(plaintext)).toString('base64url')
}

function getStorageRouteUrl(
  context: string,
  delivery: TransloaditStorageRedirectDelivery,
  key: Buffer,
  request: Omit<SmartCdnImageSignRequest, 'expiresAt'>,
): string {
  const capability = encryptStorageCapability(context, key, getStorageTransform(request))
  return `${getBrowserStorageRoute(delivery)}?${new URLSearchParams({ cap: capability })}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStorageRouteFormat(value: unknown): value is StorageImageTransform['format'] {
  return value === 'avif' || value === 'jpg' || value === 'png' || value === 'webp'
}

function getStorageTransformFromPayload(payload: unknown): StorageImageTransform | undefined {
  if (!isRecord(payload) || payload.version !== storageCapabilityVersion) return undefined
  const { background, format, height, path, quality, width, strategy } = payload
  if (
    !isStorageRouteFormat(format) ||
    (background !== undefined &&
      (format === 'jpg'
        ? !isOpaqueImageBackground(background)
        : background !== transparentImageBackground)) ||
    (strategy !== undefined && strategy !== 'fillcrop') ||
    typeof height !== 'number' ||
    !Number.isInteger(height) ||
    height < 1 ||
    height > maximumImageDimension ||
    typeof path !== 'string' ||
    typeof quality !== 'number' ||
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 100 ||
    typeof width !== 'number' ||
    !Number.isInteger(width) ||
    width < 1 ||
    width > maximumImageDimension
  ) {
    return undefined
  }
  validateStoragePath(path)
  return {
    ...(typeof background === 'string' ? { background } : {}),
    format,
    height,
    path,
    quality,
    width,
    ...(strategy === 'fillcrop' ? { strategy } : {}),
  }
}

function decryptStorageCapability(
  capability: string | null,
  context: string,
  key: Buffer,
): StorageImageTransform | undefined {
  if (
    capability === null ||
    capability.length > storageCapabilityMaximumLength ||
    !storageCapabilityPattern.test(capability)
  ) {
    return undefined
  }
  const encoded = Buffer.from(capability, 'base64url')
  if (
    encoded.byteLength < storageCapabilityMinimumBytes ||
    encoded.toString('base64url') !== capability
  ) {
    return undefined
  }
  try {
    const cipher = gcmsiv(key, new Uint8Array(12), Buffer.from(context))
    const plaintext = Buffer.from(cipher.decrypt(encoded)).toString('utf8')
    const payload: unknown = JSON.parse(plaintext)
    return getStorageTransformFromPayload(payload)
  } catch {
    return undefined
  }
}

function parseStorageRouteTransform(
  url: URL,
  context: string,
  key: Buffer,
): StorageImageTransform | undefined {
  const parameters = [...url.searchParams.keys()]
  if (parameters.length !== 1 || url.searchParams.getAll('cap').length !== 1) return undefined
  return decryptStorageCapability(url.searchParams.get('cap'), context, key)
}

function createStorageRoute(
  context: string,
  delivery: TransloaditStorageRedirectDelivery,
  key: Buffer,
  policy: ResolvedStoragePolicy,
  sign: (request: SmartCdnImageSignRequest) => string,
  template: string,
  diagnose: DiagnoseStorageImage | undefined,
  buildPublicUrl: (
    request: Omit<SmartCdnImageSignRequest, 'expiresAt'>,
    md5hash?: string,
  ) => string,
): TransloaditStorageRoute {
  const reasons = {
    route:
      'Redirect route/basePath differs from this handler. Check the route export and rebuild cached markup.',
    capability:
      'Invalid or stale image capability. The signing secret, route/basePath, custom template or capability contract may have changed. Refresh cached markup.',
    prefix:
      'The requested object is outside allowedPathPrefixes. Check the current signing policy.',
    authorization:
      'Application authorization denied this image. Check the session and per-object access policy.',
  }
  const explained = new Set<string>()
  function notFound(reason: keyof typeof reasons, path?: string): Response {
    const key = JSON.stringify([reason, path])
    if (process.env.NODE_ENV === 'development' && !explained.has(key)) {
      explained.add(key)
      const publication =
        reason === 'authorization' && path !== undefined
          ? ` Storage path ${JSON.stringify(path)} is not under a public prefix in the current image configuration. ${publishImageHint(path)}`
          : ''
      console.warn(`[StorageImage] ${reasons[reason]}${publication}`)
    }
    return new Response(null, { headers: { 'Cache-Control': 'private, no-store' }, status: 404 })
  }
  return async function storageRoute(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        headers: { Allow: 'GET, HEAD', 'Cache-Control': 'private, no-store' },
        status: 405,
      })
    }
    const url = new URL(request.url)
    if (!matchesStorageRoute(url.pathname, delivery)) return notFound('route')
    const transform = parseStorageRouteTransform(url, context, key)
    if (transform === undefined) return notFound('capability')
    try {
      assertAllowedStoragePath(transform.path, policy)
    } catch {
      return notFound('prefix')
    }
    const path = transform.path
    const isPublic = delivery.public?.some((prefix) => path.startsWith(prefix)) === true
    if (!isPublic && (await delivery.authorize({ path: transform.path, request })) !== true)
      return notFound('authorization', path)

    const signRequest = {
      input: transform.path,
      template,
      urlParams: {
        ...(transform.background === undefined ? {} : { bg: transform.background }),
        f: transform.format,
        h: transform.height,
        q: transform.quality,
        r: transform.strategy ?? 'pad',
        w: transform.width,
      },
    }
    if (isPublic) {
      const source =
        policy.images !== undefined && Object.hasOwn(policy.images, path)
          ? policy.images[path]
          : undefined
      const location = buildPublicUrl(signRequest, source?.md5hash)
      diagnose?.(
        path,
        location,
        policy.public.find((prefix) => path.startsWith(prefix)),
      )
      return new Response(null, {
        status: 307,
        headers: {
          Location: location,
          // Old private capabilities carry no receipt hash; bound stale Locations after overwrite.
          // Newly rendered public images bypass this compatibility route with versioned CDN URLs.
          'Cache-Control': 'public, max-age=0, s-maxage=60',
          'Referrer-Policy': 'no-referrer',
        },
      })
    }
    const now = Date.now()
    const expiresAt = getStorageExpiresAt(now, policy)
    const { rotation } = getGrantPolicy(policy)
    const cacheSeconds = Math.max(
      0,
      Math.floor(Math.min(delivery.cacheMaxAgeMs ?? 0, rotation, expiresAt - now) / 1000),
    )
    const location = sign({ ...signRequest, expiresAt })
    diagnose?.(path, location)
    return new Response(null, {
      headers: {
        'Cache-Control':
          cacheSeconds > 0 ? `private, max-age=${cacheSeconds}` : 'private, no-store',
        Location: location,
        'Referrer-Policy': 'no-referrer',
      },
      status: 307,
    })
  }
}

function createImageIntegration<Catalog extends StorageImageCatalog | undefined>(
  configuration: StorageImagesConfiguration<Catalog>,
  storagePolicy: ResolvedStoragePolicy,
  getCredentials: () => { authKey: string; authSecret: string; workspace: string },
  getWorkspace: () => string,
): TransloaditImageIntegration<Catalog> | TransloaditRedirectImageIntegration<Catalog> {
  const baseUrl = configuration.baseUrl
  const storageTemplate = configuration.template ?? transloaditStoragePreviewTemplate
  const customTemplate = configuration.template
  const urlParams = snapshotUrlParams(configuration.urlParams)
  validateBaseUrl(baseUrl)
  validateTemplate(storageTemplate, 'template')
  validateGlobalUrlParams(urlParams)
  const diagnose = createImageDiagnostics(storageTemplate)
  const privateDirect = configuration.delivery === 'direct'
  const sign = (request: SmartCdnImageSignRequest): string =>
    getSignedSmartCdnUrl({
      ...getCredentials(),
      baseUrl,
      expiresAt: request.expiresAt,
      input: request.input,
      template: request.template,
      urlParams: previewUrlParams(request.template, { ...urlParams, ...request.urlParams }),
    })
  const publicTemplate = configuration.publicTemplate ?? transloaditPublicStoragePreviewTemplate
  validateTemplate(publicTemplate, 'publicTemplate')
  const buildPublicUrl = (
    request: Omit<SmartCdnImageSignRequest, 'expiresAt'>,
    md5hash?: string,
  ): string =>
    getSmartCdnUrl({
      workspace: getWorkspace(),
      baseUrl,
      template: publicTemplate,
      input: request.input,
      urlParams: previewUrlParams(publicTemplate, {
        ...urlParams,
        ...request.urlParams,
        ...(md5hash === undefined ? {} : { v: md5hash.slice(0, 16) }),
      }),
    })
  const redirectDelivery = storagePolicy.delivery
  let storageCapability: ResolvedStorageCapabilityPolicy | undefined
  function getCapability(): ResolvedStorageCapabilityPolicy {
    if (redirectDelivery === 'direct')
      throw new Error('Direct images do not use route capabilities')
    if (storageCapability === undefined) {
      const { authSecret, workspace } = getCredentials()
      storageCapability = {
        context: getStorageCapabilityContext(redirectDelivery, customTemplate, workspace),
        delivery: redirectDelivery,
        key: createStorageRouteKey(authSecret, workspace),
      }
    }
    return storageCapability
  }
  const buildStorageUrl = (request: Omit<SmartCdnImageSignRequest, 'expiresAt'>): string => {
    const capability = getCapability()
    return getStorageRouteUrl(capability.context, capability.delivery, capability.key, request)
  }

  function createModel<Expiry extends number | undefined>(
    props: ResolvedStorageImageProps,
    expiresAt: Expiry,
    resolveUrl: (request: SmartCdnImageSignRequest<Expiry>) => string,
    template = storageTemplate,
  ): TransloaditImageModel {
    const model = createTransloaditImageModel(
      {
        cropAspectRatio: props.cropAspectRatio,
        expiresAt,
        fallbackBackground: props.fallbackBackground,
        fallbackQuality: props.fallbackQuality,
        fallbackWidth: props.fallbackWidth,
        formats: props.formats,
        maximumWidth: props.maximumWidth,
        src: props.source,
        template,
        widths: props.widths,
      },
      resolveUrl,
    )
    if (props.artDirection === undefined || props.artDirection.length === 0) return model
    return {
      ...model,
      artDirection: props.artDirection.map(({ media, cropAspectRatio }) => ({
        media,
        model: createModel(
          { ...props, cropAspectRatio, artDirection: undefined },
          expiresAt,
          resolveUrl,
          template,
        ),
      })),
    }
  }

  let explainedDirectDelivery = false
  async function DirectStorageImage({
    props,
  }: TransloaditStorageImageRequestProps): Promise<ReactNode> {
    await connection()
    if (process.env.NODE_ENV === 'development' && !explainedDirectDelivery) {
      explainedDirectDelivery = true
      console.info(
        'StorageImage (direct) makes this route dynamic; use redirect delivery for static pages',
      )
    }
    const model = createModel(props, getStorageExpiresAt(Date.now(), storagePolicy), sign)
    const diagnostic = diagnose?.(
      props.source.path,
      model.sources[0]?.candidates[0]?.url ?? model.fallbackUrl,
    )
    return renderPicture(props, model, diagnostic, true)
  }

  function StorageImage(props: TransloaditImageProps<Catalog>): ReactNode {
    const layout = resolveImageLayout(props, storagePolicy.images)
    assertAllowedStoragePath(layout.source.path, storagePolicy)
    const storageProps = snapshotStorageImageProps(props, layout)
    const publicPrefix = storagePolicy.public.find((prefix) =>
      layout.source.path.startsWith(prefix),
    )
    if (publicPrefix !== undefined) {
      const model = createModel(
        storageProps,
        undefined,
        (request) => buildPublicUrl(request, layout.source.md5hash),
        publicTemplate,
      )
      const diagnostic = diagnose?.(
        layout.source.path,
        model.sources[0]?.candidates[0]?.url ?? model.fallbackUrl,
        publicPrefix,
      )
      return renderPicture(storageProps, model, diagnostic, true)
    }
    if (redirectDelivery === 'direct') {
      if (!privateDirect)
        throw new TypeError("Private images require authorize or delivery: 'direct'")
      return (
        <Suspense
          fallback={
            storageProps.suspenseFallback === undefined ? (
              <StorageImagePlaceholder props={storageProps} />
            ) : (
              storageProps.suspenseFallback
            )
          }
        >
          <DirectStorageImage props={storageProps} />
        </Suspense>
      )
    }
    if (storageProps.suspenseFallback !== undefined) {
      throw new TypeError('suspenseFallback is only used by direct Storage delivery')
    }
    const resolvedModel = createModel(storageProps, undefined, buildStorageUrl)
    const model: TransloaditImageModel = {
      artDirection: resolvedModel.artDirection,
      fallbackUrl: resolvedModel.fallbackUrl,
      sources: resolvedModel.sources,
    }
    return renderPicture(storageProps, model)
  }

  const integration: TransloaditImageIntegration<Catalog> = { StorageImage }
  if (redirectDelivery === 'direct') return integration
  let route: TransloaditStorageRoute | undefined
  return {
    ...integration,
    async storageRoute(request) {
      if (route === undefined) {
        const capability = getCapability()
        route = createStorageRoute(
          capability.context,
          capability.delivery,
          capability.key,
          storagePolicy,
          sign,
          storageTemplate,
          diagnose,
          buildPublicUrl,
        )
      }
      return await route(request)
    },
  }
}

/** Reads rendering credentials once on first render/request, not while importing the factory. */
export function createStorageImages<Catalog extends StorageImageCatalog | undefined = undefined>(
  configuration: PrivateStorageImagesConfiguration<Catalog>,
): TransloaditRedirectImageIntegration<Catalog>
export function createStorageImages<Catalog extends StorageImageCatalog | undefined = undefined>(
  configuration: StorageImagesConfiguration<Catalog>,
): TransloaditImageIntegration<Catalog>
export function createStorageImages<Catalog extends StorageImageCatalog | undefined = undefined>(
  input: StorageImagesConfiguration<Catalog>,
): TransloaditImageIntegration<Catalog> | TransloaditRedirectImageIntegration<Catalog> {
  const configuration =
    typeof input?.delivery === 'object' && input.delivery !== null
      ? {
          ...input,
          baseUrl: input.baseUrl ?? input.delivery.baseUrl,
          urlParams: input.urlParams ?? input.delivery.urlParams,
          delivery: undefined,
        }
      : input
  const policy = getStoragePolicy(configuration)
  const explicit = {
    authKey: configuration.authKey,
    authSecret: configuration.authSecret,
    workspace: configuration.workspace,
  }
  if (configuration.authorize !== undefined || configuration.delivery === 'direct')
    for (const [name, value] of Object.entries(explicit))
      if (value !== undefined) validateRequiredConfiguration(value, name)
  let workspace: string | undefined
  function getWorkspace(): string {
    if (workspace === undefined) {
      const value = process.env.TRANSLOADIT_WORKSPACE || explicit.workspace
      validateRequiredConfiguration(value, 'TRANSLOADIT_WORKSPACE')
      workspace = value
    }
    return workspace
  }
  let credentials: { authKey: string; authSecret: string; workspace: string } | undefined
  return createImageIntegration(
    configuration,
    policy,
    () => {
      if (credentials === undefined) {
        const separate =
          process.env.TRANSLOADIT_SMART_CDN_KEY !== undefined ||
          process.env.TRANSLOADIT_SMART_CDN_SECRET !== undefined
        const explicitPair = explicit.authKey !== undefined || explicit.authSecret !== undefined
        const keyName = explicitPair
          ? 'authKey'
          : separate
            ? 'TRANSLOADIT_SMART_CDN_KEY'
            : 'TRANSLOADIT_KEY'
        const secretName = explicitPair
          ? 'authSecret'
          : separate
            ? 'TRANSLOADIT_SMART_CDN_SECRET'
            : 'TRANSLOADIT_SECRET'
        const authKey = explicitPair ? explicit.authKey : process.env[keyName]
        const authSecret = explicitPair ? explicit.authSecret : process.env[secretName]
        validateRequiredConfiguration(authKey, keyName)
        validateRequiredConfiguration(authSecret, secretName)
        credentials = { authKey, authSecret, workspace: getWorkspace() }
      }
      return credentials
    },
    getWorkspace,
  )
}
