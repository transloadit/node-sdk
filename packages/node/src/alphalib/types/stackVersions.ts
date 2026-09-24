/** Runtime stack selection, ordered oldest to newest; stack IDs are not tool version numbers. */
export const runtimeStackVersions = {
  exiftool: { default: 'v13.36', valid: ['v13.36'] },
  mplayer: { default: 'v1.5.0', valid: ['v1.5.0'] },
  mediainfo: { default: 'v23.10', valid: ['v23.10'] },
  imagemagick: {
    default: 'v2.0.10',
    // Normalizers upgrade these versions; AssemblyValidator supplies deprecation warnings.
    deprecated: { 'v2.0.9': 'v2.0.10', 'v3.0.0': 'v3.0.1' },
    valid: ['v2.0.10', 'v3.0.1'],
  },
  ffmpeg: {
    default: 'v6.0.0',
    // v5 remains accepted input but its binary has been retired after this cutoff.
    deprecated: { 'v5.0.0': 'v6.0.0' },
    autoUpgradeAfter: { 'v5.0.0': '2026-04-30T00:00:00.000Z' },
    valid: ['v6.0.0', 'v7.0.0', 'v8.0.0'],
    highest: 'v8.0.0',
  },
  file: { default: 'v5.46', valid: ['v5.46'] },
} as const

/** Public authoring recommendations, deliberately distinct from applied runtime defaults. */
export const stackVersions = {
  ffmpeg: {
    recommendedVersion: 'v7' as const,
    test: /^v?[5-8](\.[0-9]+)?(\.[0-9]+)?$/u,
    suggestedValues: ['v6', 'v7', 'v8'] as const,
  },
  imagemagick: {
    recommendedVersion: 'v3' as const,
    test: /^v?[23](\.[0-9]+)?(\.[0-9]+)?$/u,
    suggestedValues: ['v2', 'v3'] as const,
  },
}
