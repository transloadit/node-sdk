import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import { quoteCliArgument } from './helpers.ts'

/** Locate ordinary Next.js app directories without assuming the consumer's source layout. */
export function nextAppRoot(): '' | 'src/' | undefined {
  if (statSync('app', { throwIfNoEntry: false })?.isDirectory()) return ''
  if (statSync('src/app', { throwIfNoEntry: false })?.isDirectory()) return 'src/'
  return undefined
}

/** Advice only: never execute or rewrite a consumer's Next config after a successful upload. */
export async function storageImageConfigAdvice(): Promise<string> {
  for (const file of ['next.config.ts', 'next.config.mjs', 'next.config.js']) {
    // An unavailable optional hint must not turn a completed Storage write into a CLI failure.
    const source = await readFile(file, 'utf8').catch(() => undefined)
    if (source === undefined) continue
    if (source.includes('withTransloaditImages')) return ''
    return `\n${file} is not wrapped yet. Keep your existing config in nextConfig and wrap its export:\nimport { withTransloaditImages } from '@transloadit/img/next/config'\nexport default withTransloaditImages(nextConfig)`
  }
  return ''
}

/** Private redirect delivery needs an application authorizer and key, not the CLI login key. */
export function storageImagePrivateAdvice(path: string, receipts?: string): string {
  const prefix = path.slice(0, path.lastIndexOf('/') + 1)
  if (prefix === '')
    return '\nThis object is private. Configure per-object authorization explicitly, or store it under a directory to use image init --private. Set TRANSLOADIT_SMART_CDN_KEY/SECRET for rendering.'
  const catalogOption = receipts === undefined ? '' : ` --receipts=${quoteCliArgument(receipts)}`
  return `\nThis directory is private. Rendering needs transloadit.authorize.ts and ${nextAppRoot() ?? ''}app/api/storage-images/route.ts (npx transloadit image init --private${catalogOption} -- ${quoteCliArgument(prefix)}) and TRANSLOADIT_SMART_CDN_KEY/SECRET. Restart next dev after adding them.`
}

function relativeImport(path: string): string {
  return path.startsWith('./') || path.startsWith('../') ? path : `./${path}`
}

function sourceString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')}'`
}

/** An empty-safe scaffold showing the first receipt in the initialized directory. */
export function storageImagePage(
  receiptsImport: string,
  prefix: string,
  receipts?: string,
): string {
  const catalogOption = receipts === undefined ? '' : ` --receipts=${quoteCliArgument(receipts)}`
  const command = `npx transloadit storage store${catalogOption}${prefix.startsWith('-') ? ' --' : ''} ./hero.jpg ${quoteCliArgument(`${prefix}hero.jpg`)}`
  return [
    "import { StorageImage } from '@transloadit/img/next'",
    `import catalog from ${sourceString(relativeImport(receiptsImport))}`,
    '',
    'export default function Page() {',
    `  const path = Object.keys(catalog.images).find((path) => path.startsWith(${sourceString(prefix)}))`,
    '  if (path === undefined)',
    '    return (',
    '      <p>',
    `        Run <code>{${sourceString(command)}}</code> to add your`,
    '        first image.',
    '      </p>',
    '    )',
    '  // Object.keys only returns own catalog keys, including when the catalog is still empty.',
    '  const src = path as keyof typeof catalog.images',
    '  // Replace the filename-derived alt with a description, or an empty string if decorative.',
    '  const alt = path',
    "    .slice(path.lastIndexOf('/') + 1)",
    "    .replace(/\\.[^.]+$/, '')",
    "    .replaceAll(/[-_]+/g, ' ')",
    '  return (',
    '    <StorageImage',
    '      src={src}',
    '      alt={alt}',
    '      width={960}',
    '      preload',
    '      errorFallback={',
    '        <p role="status">',
    '          This image could not be loaded. Check the Storage path and delivery configuration.',
    '        </p>',
    '      }',
    '    />',
    '  )',
    '}',
    '',
  ].join('\n')
}

/** Rendering-only variable names; values belong in the application's secret configuration. */
export function storageImageEnvBlock(publicOnly: boolean): string {
  return publicOnly ? '' : 'TRANSLOADIT_KEY=\nTRANSLOADIT_SECRET=\n'
}
