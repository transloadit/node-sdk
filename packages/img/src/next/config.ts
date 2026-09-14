import type { NextConfig } from 'next'

import type { StorageImageDelivery } from './catalog.ts'

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } from 'next/constants.js'

/** Bind a single project catalog; use explicit factories for several independently typed catalogs. */
export interface TransloaditImagesOptions {
  catalog?: string
  delivery?: StorageImageDelivery
  /** The Next.js app directory, for commands started from a monorepo's parent directory. */
  root?: string
}

/** Bundle the catalog and optional authorizer with both Next bundlers; no runtime cwd lookup. */
export function withTransloaditImages(
  nextConfig: NextConfig = {},
  options: TransloaditImagesOptions = {},
): (phase: string) => NextConfig {
  // next start only serves compiled modules. Deployment may prune the generation cache and
  // source catalog, or mount a read-only filesystem; neither is a runtime prerequisite.
  return (phase) =>
    phase === PHASE_PRODUCTION_SERVER ? nextConfig : buildConfiguration(nextConfig, options, phase)
}

function buildConfiguration(
  nextConfig: NextConfig,
  options: TransloaditImagesOptions,
  phase: string,
): NextConfig {
  const root = resolve(options.root ?? process.cwd())
  const catalog = resolve(root, options.catalog ?? 'transloadit.images.json')
  function projectPath(file: string): string {
    const path = relative(root, file).replaceAll('\\', '/')
    if (path.startsWith('../') || isAbsolute(path))
      throw new Error(
        'The Storage image catalog must be inside the Next.js app; use an explicit factory for shared catalogs outside it.',
      )
    return `./${path}`
  }
  const catalogPath = projectPath(catalog)
  if (!statSync(catalog, { throwIfNoEntry: false })?.isFile())
    throw new Error(
      `Missing Storage image catalog ${catalogPath}. Run transloadit storage store ./hero.jpg website/hero.jpg first (add --public only for public images), or select an existing catalog in withTransloaditImages.`,
    )
  const authorize = resolve(root, 'transloadit.authorize.ts')
  // Turbopack treats the build output directory as output, not an importable source tree.
  const generated = resolve(root, 'node_modules/.cache/transloadit-images')
  const configuration = resolve(generated, 'options.json')
  const value = `${JSON.stringify({
    ...(phase === PHASE_DEVELOPMENT_SERVER ? { diagnosticsId: catalog } : {}),
    ...(nextConfig.basePath ? { basePath: nextConfig.basePath } : {}),
    ...(options.delivery === undefined
      ? {}
      : {
          delivery: {
            baseUrl: options.delivery.baseUrl,
            urlParams: options.delivery.urlParams,
          },
        }),
  })}\n`
  // Avoid needless invalidation in dev. This build-only JSON carries no catalog copy,
  // authorization code or credentials.
  if (
    !statSync(configuration, { throwIfNoEntry: false })?.isFile() ||
    readFileSync(configuration, 'utf8') !== value
  ) {
    mkdirSync(generated, { recursive: true })
    writeFileSync(configuration, value)
  }
  const aliases: Record<string, string> = {
    '@transloadit/img/next/catalog': catalogPath,
    '@transloadit/img/next/options': projectPath(configuration),
    ...(statSync(authorize, { throwIfNoEntry: false })?.isFile()
      ? { '@transloadit/img/next/authorize': projectPath(authorize) }
      : {}),
  }
  return {
    ...nextConfig,
    turbopack: {
      ...nextConfig.turbopack,
      resolveAlias: { ...nextConfig.turbopack?.resolveAlias, ...aliases },
    },
    outputFileTracingIncludes: {
      ...nextConfig.outputFileTracingIncludes,
      '/*': [
        ...new Set([
          ...(nextConfig.outputFileTracingIncludes?.['/*'] ?? []),
          ...Object.values(aliases),
        ]),
      ],
    },
    webpack(config, context) {
      const configured = nextConfig.webpack?.(config, context) ?? config
      configured.resolve ??= {}
      configured.resolve.alias = {
        ...configured.resolve.alias,
        ...Object.fromEntries(
          Object.entries(aliases).map(([name, path]) => [`${name}$`, resolve(root, path)]),
        ),
      }
      return configured
    },
  }
}
