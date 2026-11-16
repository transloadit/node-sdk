/** Read exactly one package’s metadata from npm pack --json across npm versions. */
export function parsePackResult(stdout: string): Record<string, unknown> & { filename: string } {
  const packed: unknown = JSON.parse(stdout)
  // npm 12 keys pack results by package name; older versions return an array or one result.
  const results: unknown[] = Array.isArray(packed)
    ? packed
    : packed !== null &&
        typeof packed === 'object' &&
        (!('filename' in packed) || typeof packed.filename !== 'string')
      ? Object.values(packed)
      : [packed]
  const info = results.length === 1 ? results[0] : undefined
  if (
    info === null ||
    typeof info !== 'object' ||
    Array.isArray(info) ||
    !('filename' in info) ||
    typeof info.filename !== 'string' ||
    info.filename.length === 0
  ) {
    throw new Error('npm pack did not return exactly one package with a tarball filename')
  }
  return { ...info, filename: info.filename }
}
