export const stackVersions = {
  ffmpeg: {
    recommendedVersion: 'v6' as const,
    test: /^v?[56](\.\d+)?(\.\d+)?$/,
    suggestedValues: ['v5', 'v6'] as const,
  },
  imagemagick: {
    recommendedVersion: 'v3' as const,
    test: /^v?[23](\.\d+)?(\.\d+)?$/,
    suggestedValues: ['v2', 'v3'] as const,
  },
}
