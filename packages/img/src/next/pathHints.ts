import { validateStoragePath } from '@transloadit/utils'

function quoteArgument(value: string): string {
  // Copyable POSIX commands must not expand a path containing quotes or shell expressions.
  return /^[a-zA-Z0-9_./-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`
}

function editDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1
  let row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    const next = [i]
    for (let j = 1; j <= right.length; j++) {
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + Number(left[i - 1] !== right[j - 1]),
      )
    }
    if (Math.min(...next) > limit) return limit + 1
    row = next
  }
  return row[right.length]
}

/** Actionable catalog errors; suggestions are bounded to short paths and small spelling errors. */
export function missingImageHint(path: string, paths: readonly string[]): string {
  // Shell quoting cannot neutralize terminal control characters or bound an oversized log line.
  try {
    validateStoragePath(path)
  } catch (error) {
    // A formatting mistake can name an exact existing key without becoming upload advice.
    const corrected = path.length <= 256 ? path.trim().replace(/^\/+/, '') : undefined
    if (corrected !== undefined && paths.includes(corrected))
      return `Storage image path ${JSON.stringify(path)} is invalid. Did you mean ${JSON.stringify(corrected)}? Use the exact catalog key; no upload is needed.`
    throw error
  }
  let nearest: string | undefined
  let distance = 4
  if (path.length <= 256) {
    for (const candidate of paths) {
      if (candidate.length > 256) continue
      const score = editDistance(path, candidate, distance - 1)
      if (score >= distance) continue
      nearest = candidate
      distance = score
    }
  }
  const suggestion = nearest === undefined ? '' : ` Did you mean ${JSON.stringify(nearest)}?`
  return `Storage image path ${JSON.stringify(path)} is not in the configured catalog.${suggestion} For a custom catalog, add --receipts <catalog.json> to the command. For an explicit factory, update its images configuration too. To upload a new image, run:\n  npx transloadit storage store -- ./image.jpg ${quoteArgument(path)}`
}

/** Publication is an explicit choice, never an automatic remedy for a denied private image. */
export function publishImageHint(
  path: string,
  prefix = path.slice(0, path.lastIndexOf('/') + 1),
): string {
  if (prefix === '')
    return 'If it should be public, store it in a directory and publish that prefix; workspace-root publication is not supported.'
  return `For a custom catalog, add --receipts <catalog.json> to the command. Keep an explicit factory’s public list in sync too. If it should be public, run:\n  npx transloadit storage publish -- ${quoteArgument(prefix)}`
}
