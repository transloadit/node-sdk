import { statSync } from 'node:fs'

import { quoteCliArgument } from './helpers.ts'

/** Locate ordinary Next.js app directories without assuming the consumer's source layout. */
export function nextAppRoot(): '' | 'src/' | undefined {
  if (statSync('app', { throwIfNoEntry: false })?.isDirectory()) return ''
  if (statSync('src/app', { throwIfNoEntry: false })?.isDirectory()) return 'src/'
  return undefined
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
