import 'server-only'

import type { SmartCdnUrlParams } from '@transloadit/utils/node'
import type { ReactNode } from 'react'

import type {
  SmartCdnImageSignRequest,
  StoragePreviewFormats,
  StoragePreviewSource,
  UrlImageFormats,
  UrlImageSource,
} from '../index.ts'
import type { TransloaditImagePresentationProps } from './index.tsx'

import { getSignedSmartCdnUrl } from '@transloadit/utils/node'
import { connection } from 'next/server.js'
import { Suspense } from 'react'

import { getCanonicalPublicImageUrl, snapshotImageSource } from '../imageSource.ts'
import { createTransloaditImageModel } from '../index.ts'
import { validateStoragePath, validateStoragePathPrefix } from '../storagePath.ts'
import { TransloaditPicture } from './index.tsx'

const defaultStorageExpiresInMs = 60 * 60 * 1000
const defaultStorageRotationIntervalMs = 5 * 60 * 1000
const imagePolicyParams = new Set(['auth_key', 'exp', 'f', 'h', 'q', 'r', 'sig', 'w'])
const maxStorageLifetimeMs = 48 * 60 * 60 * 1000

/** Bounded request-time expiry policy for private Storage previews. */
export interface TransloaditStorageImageConfiguration {
  /** Authorized directory prefixes. Defaults to deny-all; an empty prefix explicitly allows all. */
  allowedPathPrefixes?: readonly string[]
  /** Minimum lifetime after a request render. Defaults to one hour. */
  expiresInMs?: number
  /** Stable URL rotation bucket. Defaults to five minutes. */
  rotationIntervalMs?: number
}

/** Server-only credentials and trusted Smart CDN configuration. */
export interface TransloaditImageConfiguration {
  /** Exact HTTP(S) origins that URL sources may use. Defaults to none. */
  allowedSourceOrigins?: readonly string[]
  authKey: string
  authSecret: string
  /** Trusted development endpoint override; never derive this from request data. */
  baseUrl?: string
  storage?: TransloaditStorageImageConfiguration
  /** Trusted compatible Template overrides for the two source policies. */
  templates?: {
    storage?: string
    url?: string
  }
  /** Trusted transport parameters appended to every signed URL, such as `cdn=required`. */
  urlParams?: SmartCdnUrlParams
  workspace: string
}

interface CommonTransloaditImageProps extends TransloaditImagePresentationProps {
  widths: readonly number[]
}

/** Props for a statically rendered, immutable public HTTP(S) image. */
export interface UrlTransloaditImageProps extends CommonTransloaditImageProps {
  expiresAt: number
  fallbackSrc?: string
  fallbackQuality?: never
  formats?: UrlImageFormats
  source: UrlImageSource
  suspenseFallback?: never
}

/** Props for a bounded request-rendered Transloadit Storage preview. */
export interface StorageTransloaditImageProps
  extends Omit<CommonTransloaditImageProps, 'media' | 'mediaPlaceholderSrc'> {
  expiresAt?: never
  fallbackSrc?: never
  /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
  fallbackQuality?: number
  formats?: StoragePreviewFormats
  media?: never
  mediaPlaceholderSrc?: never
  source: StoragePreviewSource
  /** Static shell shown until the request-rendered signed preview is ready. */
  suspenseFallback?: ReactNode
}

/** Props accepted by a configured Next.js Transloadit image Server Component. */
export type TransloaditImageProps = UrlTransloaditImageProps | StorageTransloaditImageProps

/** A configured Next.js Server Component with source-specific props. */
export interface TransloaditImageComponent {
  (props: StorageTransloaditImageProps): ReactNode
  (props: UrlTransloaditImageProps): ReactNode
  (props: TransloaditImageProps): ReactNode
}

interface ResolvedStoragePolicy {
  allowedPathPrefixes: readonly string[]
  expiresInMs: number
  rotationIntervalMs: number
}

interface TransloaditStorageImageRequestProps {
  props: StorageTransloaditImageProps
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

function validateGlobalUrlParams(urlParams: SmartCdnUrlParams | undefined): void {
  for (const parameter of Object.keys(urlParams ?? {})) {
    if (imagePolicyParams.has(parameter)) {
      throw new TypeError(`urlParams must not override image policy parameter: ${parameter}`)
    }
  }
}

function getStoragePolicy(
  configuration: TransloaditStorageImageConfiguration | undefined,
): ResolvedStoragePolicy {
  const allowedPathPrefixes = configuration?.allowedPathPrefixes ?? []
  const expiresInMs = configuration?.expiresInMs ?? defaultStorageExpiresInMs
  const rotationIntervalMs = configuration?.rotationIntervalMs ?? defaultStorageRotationIntervalMs
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
  if (expiresInMs + rotationIntervalMs > maxStorageLifetimeMs) {
    throw new RangeError('Storage image expiry plus its rotation interval must not exceed 48 hours')
  }
  return {
    allowedPathPrefixes: [...validatedPathPrefixes],
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

function getAllowedSourceOrigins(origins: readonly string[] | undefined): ReadonlySet<string> {
  if (origins === undefined) return new Set()
  if (!Array.isArray(origins)) throw new TypeError('allowedSourceOrigins must be an array')

  const normalized = new Set<string>()
  for (const [index, origin] of origins.entries()) {
    const error = new TypeError(
      `allowedSourceOrigins[${index}] must be one exact HTTP or HTTPS origin`,
    )
    if (typeof origin !== 'string' || origin === '' || origin.trim() !== origin || origin === '*') {
      throw error
    }
    let parsed: URL
    try {
      parsed = new URL(origin)
    } catch {
      throw error
    }
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.pathname !== '/' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) {
      throw error
    }
    normalized.add(parsed.origin.toLowerCase())
  }
  return normalized
}

function getAllowedUrlSource(input: unknown, allowedSourceOrigins: ReadonlySet<string>): string {
  const sourceUrl = new URL(getCanonicalPublicImageUrl(input))
  const origin = sourceUrl.origin.toLowerCase()
  if (!allowedSourceOrigins.has(origin)) {
    throw new TypeError(`URL image source origin is not allowed: ${origin}`)
  }
  return sourceUrl.href
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

function hasMatchingAspectRatio(
  props: CommonTransloaditImageProps,
  source: UrlImageSource,
): boolean {
  if (
    !isPositiveSafeInteger(source.width) ||
    !isPositiveSafeInteger(source.height) ||
    !isPositiveSafeInteger(props.width) ||
    !isPositiveSafeInteger(props.height)
  ) {
    return true
  }
  const left = BigInt(source.width) * BigInt(props.height)
  const right = BigInt(source.height) * BigInt(props.width)
  const difference = left > right ? left - right : right - left
  const scale = left > right ? left : right
  // Source metadata commonly rounds one edge by a pixel; tolerate up to 0.5% before requiring fit.
  return difference * 10_000n <= scale * 50n
}

function validateUrlPresentation(props: CommonTransloaditImageProps, source: UrlImageSource): void {
  if (
    !hasMatchingAspectRatio(props, source) &&
    props.objectFit === undefined &&
    props.style?.objectFit === undefined
  ) {
    throw new TypeError('objectFit must be set when display and source aspect ratios differ')
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
  source: StoragePreviewSource,
): StorageTransloaditImageProps {
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
    source,
    style: props.style === undefined ? undefined : { ...props.style },
    suspenseFallback: props.suspenseFallback,
    width: props.width,
    widths: Array.isArray(props.widths) ? [...props.widths] : props.widths,
  }
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

/** Creates a credentialed Next.js Server Component without reading application environment state. */
export function createTransloaditImage(
  configuration: TransloaditImageConfiguration,
): TransloaditImageComponent {
  const authKey = configuration.authKey
  const authSecret = configuration.authSecret
  const baseUrl = configuration.baseUrl
  const storageTemplate = configuration.templates?.storage
  const urlParams = snapshotUrlParams(configuration.urlParams)
  const urlTemplate = configuration.templates?.url
  const workspace = configuration.workspace
  validateRequiredConfiguration(authKey, 'authKey')
  validateRequiredConfiguration(authSecret, 'authSecret')
  validateRequiredConfiguration(workspace, 'workspace')
  validateGlobalUrlParams(urlParams)
  const allowedSourceOrigins = getAllowedSourceOrigins(configuration.allowedSourceOrigins)
  const storagePolicy = getStoragePolicy(configuration.storage)
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

  async function TransloaditStorageImage({
    props,
  }: TransloaditStorageImageRequestProps): Promise<ReactNode> {
    await connection()
    const model = createTransloaditImageModel(
      {
        expiresAt: getStorageExpiresAt(Date.now(), storagePolicy),
        fallbackQuality: props.fallbackQuality,
        formats: props.formats,
        height: props.height,
        source: props.source,
        template: storageTemplate,
        width: props.width,
        widths: props.widths,
      },
      sign,
    )
    const loading: 'eager' | 'lazy' = props.loading ?? (props.deferUntilHydrated ? 'lazy' : 'eager')
    return renderPicture({ ...props, loading }, model)
  }

  function TransloaditImage(props: StorageTransloaditImageProps): ReactNode
  function TransloaditImage(props: UrlTransloaditImageProps): ReactNode
  function TransloaditImage(props: TransloaditImageProps): ReactNode
  function TransloaditImage(props: TransloaditImageProps): ReactNode {
    const source = snapshotImageSource(props.source)
    if (source.type === 'storage') {
      if (props.fallbackSrc !== undefined) {
        throw new TypeError('fallbackSrc is only supported for public URL image sources')
      }
      if (props.media !== undefined) {
        throw new TypeError(
          'Storage image previews cannot use media because their signed URLs can expire',
        )
      }
      assertAllowedStoragePath(source.path, storagePolicy)
      const storageProps = snapshotStorageImageProps(props, source)
      return (
        <Suspense fallback={props.suspenseFallback}>
          <TransloaditStorageImage props={storageProps} />
        </Suspense>
      )
    }

    if (props.fallbackQuality !== undefined) {
      throw new TypeError('fallbackQuality is only supported for Storage image sources')
    }
    validateUrlPresentation(props, source)
    const sourceUrl = getAllowedUrlSource(source.url, allowedSourceOrigins)
    const expiresAt = props.expiresAt
    if (expiresAt === undefined) {
      throw new TypeError('expiresAt is required for public URL image sources')
    }
    const model = createTransloaditImageModel(
      {
        expiresAt,
        fallbackUrl: props.fallbackSrc,
        formats: props.formats,
        source: {
          height: source.height,
          type: 'url',
          url: sourceUrl,
          width: source.width,
        },
        template: urlTemplate,
        widths: props.widths,
      },
      sign,
    )
    return renderPicture(props, model)
  }

  return TransloaditImage
}
