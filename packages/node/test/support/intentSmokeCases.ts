import {
  getIntentCatalogKey,
  getIntentPaths,
  intentCatalog,
} from '../../src/cli/intentCommandSpecs.ts'

export interface IntentSmokeCase {
  args: string[]
  key: string
  outputPath: string
  paths: string[]
  verifier: string
}

const intentSmokeOverrides: Record<string, Omit<IntentSmokeCase, 'key' | 'paths'>> = {
  '/audio/waveform': {
    args: ['--input', '@fixture/input.mp3'],
    outputPath: 'audio-waveform.png',
    verifier: 'png',
  },
  '/document/autorotate': {
    args: ['--input', '@fixture/input.pdf'],
    outputPath: 'document-auto-rotate.pdf',
    verifier: 'pdf',
  },
  '/document/convert': {
    args: ['--input', '@fixture/input.txt', '--format', 'pdf'],
    outputPath: 'document-convert.pdf',
    verifier: 'pdf',
  },
  '/document/optimize': {
    args: ['--input', '@fixture/input.pdf'],
    outputPath: 'document-optimize.pdf',
    verifier: 'pdf',
  },
  '/document/thumbs': {
    args: ['--input', '@fixture/input.pdf'],
    outputPath: 'document-thumbs',
    verifier: 'document-thumbs',
  },
  '/file/compress': {
    args: ['--input', '@fixture/input.txt', '--format', 'zip'],
    outputPath: 'file-compress.zip',
    verifier: 'zip',
  },
  '/file/decompress': {
    args: ['--input', '@fixture/input.zip'],
    outputPath: 'file-decompress',
    verifier: 'file-decompress',
  },
  '/file/preview': {
    args: ['--input', '@preview-url', '--width', '300'],
    outputPath: 'preview-generate.png',
    verifier: 'png',
  },
  '/image/bgremove': {
    args: ['--input', '@fixture/input.jpg'],
    outputPath: 'image-remove-background.png',
    verifier: 'png',
  },
  'image-generate:image/generate': {
    args: [
      '--prompt',
      'A small red bicycle on a cream background, studio lighting',
      '--model',
      'google/nano-banana',
    ],
    outputPath: 'image-generate.png',
    verifier: 'png',
  },
  'image-describe:image/describe': {
    args: ['--input', '@fixture/input.jpg'],
    outputPath: 'image-describe.json',
    verifier: 'json',
  },
  'markdown-pdf:markdown/pdf': {
    args: ['--input', '@fixture/input.md'],
    outputPath: 'markdown-pdf.pdf',
    verifier: 'pdf',
  },
  'markdown-docx:markdown/docx': {
    args: ['--input', '@fixture/input.md'],
    outputPath: 'markdown-docx.docx',
    verifier: 'docx',
  },
  '/image/optimize': {
    args: ['--input', '@fixture/input.jpg'],
    outputPath: 'image-optimize.jpg',
    verifier: 'jpeg',
  },
  '/image/resize': {
    args: ['--input', '@fixture/input.jpg', '--width', '200'],
    outputPath: 'image-resize.jpg',
    verifier: 'jpeg',
  },
  '/text/speak': {
    args: ['--prompt', 'Hello from the Transloadit Node CLI intents test.', '--provider', 'aws'],
    outputPath: 'text-speak.mp3',
    verifier: 'mp3',
  },
  '/video/thumbs': {
    args: ['--input', '@fixture/input.mp4'],
    outputPath: 'video-thumbs',
    verifier: 'video-thumbs',
  },
  'builtin/encode-hls-video@latest': {
    args: ['--input', '@fixture/input.mp4'],
    outputPath: 'video-encode-hls',
    verifier: 'video-encode-hls',
  },
}

export const intentSmokeCases = intentCatalog.map((intent) => {
  const key = getIntentCatalogKey(intent)
  const smokeCase = intentSmokeOverrides[key]
  if (smokeCase == null) {
    throw new Error(`Missing smoke-case definition for ${key}`)
  }

  return {
    ...smokeCase,
    key,
    paths: getIntentPaths(intent),
  }
}) satisfies IntentSmokeCase[]
