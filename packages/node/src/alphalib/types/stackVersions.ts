export const stackVersions = {
  ffmpeg: {
    recommendedVersion: 'v6' as const,
    test: /^v?[5-8](\.\d+)?(\.\d+)?$/,
    suggestedValues: ['v6', 'v7', 'v8'] as const,
  },
  imagemagick: {
    recommendedVersion: 'v3' as const,
    test: /^v?[23](\.\d+)?(\.\d+)?$/,
    suggestedValues: ['v2', 'v3'] as const,
  },
}
