import 'server-only'

import type { SmartCdnUrlParams } from '@transloadit/utils/node'
import type { ReactNode } from 'react'

import type {
  SmartCdnImageSignRequest,
  StoragePreviewFormats,
  TransloaditImageModel,
} from '../index.ts'
import type { TransloaditImagePresentationProps } from './index.tsx'

import { hkdfSync } from 'node:crypto'

import { gcmsiv } from '@noble/ciphers/aes.js'
import { getSignedSmartCdnUrl } from '@transloadit/utils/node'
import { connection } from 'next/server.js'
import { Suspense } from 'react'

import { createTransloaditImageModel, transloaditStoragePreviewTemplate } from '../index.ts'
import { validateStoragePath, validateStoragePathPrefix } from '../storagePath.ts'
import { TransloaditPicture } from './index.tsx'

const defaultStorageExpiresInMs = 60 * 60 * 1000
const defaultStorageRotationIntervalMs = 5 * 60 * 1000
const imagePolicyParams = new Set(['auth_key', 'exp', 'f', 'h', 'q', 'r', 'sig', 'w'])
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

/** Application authorization for one exact private Storage object. */
export type AuthorizeTransloaditStorageImage = (
  context: TransloaditStorageAuthorizationContext,
) => boolean | Promise<boolean>

/** Request-authorized, byte-pass-through-free Storage delivery through a local route. */
export interface TransloaditStorageRedirectDelivery {
  authorize: AuthorizeTransloaditStorageImage
  /** Next.js `basePath` prepended only to browser-facing route URLs. */
  basePath?: string
  /** Internal App Router path that exports `storageRoute`, for example `/api/private-images`. */
  route: string
}

/** Bounded request-time policy for private Storage previews. */
export interface TransloaditStorageImageConfiguration {
  /** Authorized directory prefixes. Defaults to deny-all; an empty prefix explicitly allows all. */
  allowedPathPrefixes?: readonly string[]
  /** Direct signed CDN URLs are the default; an object opts into authorized redirect delivery. */
  delivery?: 'direct' | TransloaditStorageRedirectDelivery
  /** Minimum lifetime of each CDN signature. Defaults to one hour. */
  expiresInMs?: number
  /** Stable CDN-signature rotation bucket. Defaults to five minutes. */
  rotationIntervalMs?: number
}

/** Server-only credentials and trusted Smart CDN configuration. */
export interface TransloaditImageConfiguration {
  authKey: string
  authSecret: string
  /** Trusted development endpoint override; never derive this from request data. */
  baseUrl?: string
  storage: TransloaditStorageImageConfiguration
  /** Trusted compatible signed Template override for Storage previews. */
  template?: string
  /** Trusted transport parameters appended to every signed URL, such as `cdn=required`. */
  urlParams?: SmartCdnUrlParams
  workspace: string
}

/** Configuration that opts into a request-authorized Storage route. */
export interface TransloaditRedirectImageConfiguration extends TransloaditImageConfiguration {
  storage: TransloaditStorageImageConfiguration & {
    delivery: TransloaditStorageRedirectDelivery
  }
}

interface CommonTransloaditImageProps extends TransloaditImagePresentationProps {
  /** Advanced candidate override. Defaults to a conservative ladder capped at `width`. */
  widths?: readonly number[]
}

/** Props for a private Transloadit Storage preview. */
export interface TransloaditImageProps
  extends Omit<CommonTransloaditImageProps, 'media' | 'mediaPlaceholderSrc'> {
  /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
  fallbackQuality?: number
  formats?: StoragePreviewFormats
  media?: never
  mediaPlaceholderSrc?: never
  /** Relative object path inside the configured Transloadit Storage workspace. */
  src: string
  /** Static shell used only while direct request-time signing is suspended. */
  suspenseFallback?: ReactNode
}

/** One configured Next.js Server Component for Transloadit Storage objects. */
export type TransloaditImageComponent = (props: TransloaditImageProps) => ReactNode

/** A Next.js route handler that authorizes and redirects one private image request. */
export type TransloaditStorageRoute = (request: Request) => Promise<Response>

/** Direct-delivery integration. Image bytes and requests bypass the Next.js server. */
export interface TransloaditImageIntegration {
  Image: TransloaditImageComponent
}

/** Redirect-delivery integration with a route handler for private Storage images. */
export interface TransloaditRedirectImageIntegration extends TransloaditImageIntegration {
  storageRoute: TransloaditStorageRoute
}

interface ResolvedStoragePolicy {
  allowedPathPrefixes: readonly string[]
  delivery: 'direct' | TransloaditStorageRedirectDelivery
  expiresInMs: number
  rotationIntervalMs: number
}

interface ResolvedStorageCapabilityPolicy {
  context: string
  delivery: TransloaditStorageRedirectDelivery
  key: Buffer
}

interface StorageImageTransform {
  format: 'avif' | 'jpg' | 'png' | 'webp'
  height: number
  path: string
  quality: number
  width: number
}

interface TransloaditStorageImageRequestProps {
  props: TransloaditImageProps
}

function validateRequiredConfiguration(value: string, name: string): void {
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
  const error = new TypeError('storage.delivery.route must be one absolute application path')
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
  const error = new TypeError(
    'storage.delivery.basePath must be one absolute path without a trailing slash',
  )
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

function getStoragePolicy(
  configuration: TransloaditStorageImageConfiguration,
): ResolvedStoragePolicy {
  const allowedPathPrefixes = configuration.allowedPathPrefixes ?? []
  const delivery = configuration.delivery ?? 'direct'
  const expiresInMs = configuration.expiresInMs ?? defaultStorageExpiresInMs
  const rotationIntervalMs = configuration.rotationIntervalMs ?? defaultStorageRotationIntervalMs
  if (!Array.isArray(allowedPathPrefixes)) {
    throw new TypeError('storage.allowedPathPrefixes must be an array')
  }
  const validatedPathPrefixes = new Set<string>()
  for (const [index, prefix] of allowedPathPrefixes.entries()) {
    validateStoragePathPrefix(prefix, index)
    validatedPathPrefixes.add(prefix)
  }
  validateDuration(expiresInMs, 'storage.expiresInMs')
  validateDuration(rotationIntervalMs, 'storage.rotationIntervalMs')
  if (expiresInMs + rotationIntervalMs > maximumStorageLifetimeMs) {
    throw new RangeError('Storage image expiry plus its rotation interval must not exceed 48 hours')
  }
  if (delivery !== 'direct') {
    if (typeof delivery !== 'object' || delivery === null || Array.isArray(delivery)) {
      throw new TypeError('storage.delivery must be direct or a redirect configuration')
    }
    validateStorageRoute(delivery.route)
    validateStorageBasePath(delivery.basePath)
    if (typeof delivery.authorize !== 'function') {
      throw new TypeError('storage.delivery.authorize must be a function')
    }
  }
  return {
    allowedPathPrefixes: [...validatedPathPrefixes],
    delivery:
      delivery === 'direct'
        ? delivery
        : {
            authorize: delivery.authorize,
            basePath: delivery.basePath,
            route: delivery.route,
          },
    expiresInMs,
    rotationIntervalMs,
  }
}

function getStorageExpiresAt(now: number, policy: ResolvedStoragePolicy): number {
  const nextRotation = (Math.floor(now / policy.rotationIntervalMs) + 1) * policy.rotationIntervalMs
  return nextRotation + policy.expiresInMs
}

function assertAllowedStoragePath(path: string, policy: ResolvedStoragePolicy): void {
  validateStoragePath(path)
  if (!policy.allowedPathPrefixes.some((prefix) => path.startsWith(prefix))) {
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

function snapshotStorageImageProps(
  props: TransloaditImageProps,
  path: string,
): TransloaditImageProps {
  return {
    alt: props.alt,
    className: props.className,
    deferUntilHydrated: props.deferUntilHydrated,
    fallbackQuality: props.fallbackQuality,
    fetchPriority: props.fetchPriority,
    formats: props.formats === undefined ? undefined : { ...props.formats },
    height: props.height,
    loading: props.loading,
    objectFit: props.objectFit,
    preload: props.preload,
    sizes: props.sizes,
    src: path,
    style: props.style === undefined ? undefined : { ...props.style },
    suspenseFallback: props.suspenseFallback,
    width: props.width,
    widths: Array.isArray(props.widths) ? [...props.widths] : props.widths,
  }
}

function getStoragePath(src: unknown): string {
  if (typeof src !== 'string') {
    throw new TypeError('Storage image src must be one relative object path')
  }
  return src
}

function renderPicture(
  props: CommonTransloaditImageProps,
  model: Parameters<typeof TransloaditPicture>[0]['model'],
): ReactNode {
  return (
    <TransloaditPicture
      alt={props.alt}
      className={props.className}
      deferUntilHydrated={props.deferUntilHydrated}
      fetchPriority={props.fetchPriority}
      height={props.height}
      loading={props.loading}
      media={props.media}
      mediaPlaceholderSrc={props.mediaPlaceholderSrc}
      model={model}
      objectFit={props.objectFit}
      preload={props.preload}
      sizes={props.sizes}
      style={props.style}
      width={props.width}
    />
  )
}

function getStorageTransform(request: SmartCdnImageSignRequest): StorageImageTransform {
  const { f: format, h: height, q: quality, r: strategy, w: width } = request.urlParams
  if (
    (format !== 'avif' && format !== 'jpg' && format !== 'png' && format !== 'webp') ||
    typeof height !== 'number' ||
    typeof quality !== 'number' ||
    strategy !== 'pad' ||
    typeof width !== 'number'
  ) {
    throw new TypeError('Storage image model produced an unsupported transform')
  }
  return { format, height, path: request.input, quality, width }
}

function createStorageRouteKey(authSecret: string, workspace: string): Buffer {
  return Buffer.from(hkdfSync('sha256', authSecret, storageRouteKeyDomain, workspace, 32))
}

function getStorageCapabilityContext(
  delivery: TransloaditStorageRedirectDelivery,
  template: string,
  workspace: string,
): string {
  return JSON.stringify([
    storageRouteKeyDomain,
    workspace,
    template,
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
  request: SmartCdnImageSignRequest,
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
  const { format, height, path, quality, width } = payload
  if (
    !isStorageRouteFormat(format) ||
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
  return { format, height, path, quality, width }
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

function notFound(): Response {
  return new Response(null, {
    headers: { 'Cache-Control': 'private, no-store' },
    status: 404,
  })
}

function createStorageRoute(
  context: string,
  delivery: TransloaditStorageRedirectDelivery,
  key: Buffer,
  policy: ResolvedStoragePolicy,
  sign: (request: SmartCdnImageSignRequest) => string,
  template: string,
): TransloaditStorageRoute {
  return async function storageRoute(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        headers: { Allow: 'GET, HEAD', 'Cache-Control': 'private, no-store' },
        status: 405,
      })
    }
    const url = new URL(request.url)
    if (!matchesStorageRoute(url.pathname, delivery)) return notFound()
    const transform = parseStorageRouteTransform(url, context, key)
    if (transform === undefined) return notFound()
    try {
      assertAllowedStoragePath(transform.path, policy)
    } catch {
      return notFound()
    }
    if ((await delivery.authorize({ path: transform.path, request })) !== true) return notFound()

    const location = sign({
      expiresAt: getStorageExpiresAt(Date.now(), policy),
      input: transform.path,
      template,
      urlParams: {
        f: transform.format,
        h: transform.height,
        q: transform.quality,
        r: 'pad',
        w: transform.width,
      },
    })
    return new Response(null, {
      headers: {
        'Cache-Control': 'private, no-store',
        Location: location,
        'Referrer-Policy': 'no-referrer',
      },
      status: 307,
    })
  }
}

/** Creates one credentialed Next.js image integration without reading application environment. */
export function createTransloaditImage(
  configuration: TransloaditRedirectImageConfiguration,
): TransloaditRedirectImageIntegration
export function createTransloaditImage(
  configuration: TransloaditImageConfiguration,
): TransloaditImageIntegration
export function createTransloaditImage(
  configuration: TransloaditImageConfiguration,
): TransloaditImageIntegration | TransloaditRedirectImageIntegration {
  const authKey = configuration.authKey
  const authSecret = configuration.authSecret
  const baseUrl = configuration.baseUrl
  const storageTemplate = configuration.template ?? transloaditStoragePreviewTemplate
  const urlParams = snapshotUrlParams(configuration.urlParams)
  const workspace = configuration.workspace
  validateRequiredConfiguration(authKey, 'authKey')
  validateRequiredConfiguration(authSecret, 'authSecret')
  validateRequiredConfiguration(workspace, 'workspace')
  validateBaseUrl(baseUrl)
  validateTemplate(storageTemplate, 'template')
  validateGlobalUrlParams(urlParams)

  const storagePolicy = getStoragePolicy(configuration.storage)
  // Redirect capabilities do not encode this value; keeping one factory snapshot makes their
  // prerendered markup deterministic while request-time CDN signatures rotate independently.
  const storageCapabilityModelExpiresAt = getStorageExpiresAt(Date.now(), storagePolicy)
  const sign = (request: SmartCdnImageSignRequest): string =>
    getSignedSmartCdnUrl({
      authKey,
      authSecret,
      baseUrl,
      expiresAt: request.expiresAt,
      input: request.input,
      template: request.template,
      urlParams: { ...urlParams, ...request.urlParams },
      workspace,
    })
  const storageCapability: ResolvedStorageCapabilityPolicy | undefined =
    storagePolicy.delivery === 'direct'
      ? undefined
      : {
          context: getStorageCapabilityContext(storagePolicy.delivery, storageTemplate, workspace),
          delivery: storagePolicy.delivery,
          key: createStorageRouteKey(authSecret, workspace),
        }
  const buildStorageUrl =
    storageCapability === undefined
      ? sign
      : (request: SmartCdnImageSignRequest): string =>
          getStorageRouteUrl(
            storageCapability.context,
            storageCapability.delivery,
            storageCapability.key,
            request,
          )

  async function DirectStorageImage({
    props,
  }: TransloaditStorageImageRequestProps): Promise<ReactNode> {
    await connection()
    const model = createTransloaditImageModel(
      {
        expiresAt: getStorageExpiresAt(Date.now(), storagePolicy),
        fallbackQuality: props.fallbackQuality,
        formats: props.formats,
        height: props.height,
        src: props.src,
        template: storageTemplate,
        width: props.width,
        widths: props.widths,
      },
      sign,
    )
    return renderPicture(props, model)
  }

  function Image(props: TransloaditImageProps): ReactNode {
    const storagePath = getStoragePath(props.src)
    if (props.media !== undefined) {
      throw new TypeError('Storage image previews do not support media conditions')
    }
    assertAllowedStoragePath(storagePath, storagePolicy)
    const storageProps = snapshotStorageImageProps(props, storagePath)
    if (storageCapability === undefined) {
      return (
        <Suspense fallback={props.suspenseFallback}>
          <DirectStorageImage props={storageProps} />
        </Suspense>
      )
    }
    if (props.suspenseFallback !== undefined) {
      throw new TypeError('suspenseFallback is only used by direct Storage delivery')
    }
    const resolvedModel = createTransloaditImageModel(
      {
        expiresAt: storageCapabilityModelExpiresAt,
        fallbackQuality: props.fallbackQuality,
        formats: props.formats,
        height: props.height,
        src: storagePath,
        template: storageTemplate,
        width: props.width,
        widths: props.widths,
      },
      buildStorageUrl,
    )
    const model: TransloaditImageModel = {
      fallbackUrl: resolvedModel.fallbackUrl,
      sources: resolvedModel.sources,
    }
    return renderPicture(storageProps, model)
  }

  const integration: TransloaditImageIntegration = { Image }
  if (storageCapability === undefined) return integration
  return {
    ...integration,
    storageRoute: createStorageRoute(
      storageCapability.context,
      storageCapability.delivery,
      storageCapability.key,
      storagePolicy,
      sign,
      storageTemplate,
    ),
  }
}
