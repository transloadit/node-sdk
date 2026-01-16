import type { AssemblyInstructionsInput } from '@transloadit/types/template'

type AssemblyInstructionFixture =
  | { name: string; value: AssemblyInstructionsInput; valid: true }
  | { name: string; value: unknown; valid: false }

const ffmpegTemplate: AssemblyInstructionsInput = {
  steps: {
    ':original': {
      robot: '/upload/handle',
    },
    'webm-normal': {
      use: ':original',
      robot: '/video/encode',
      ffmpeg_stack: 'v6.0.0',
      preset: 'webm',
      width: 1024,
      height: 576,
      resize_strategy: 'pad',
      ffmpeg: {
        b: '2000K',
      },
    },
    'webm-no-b': {
      use: ':original',
      robot: '/video/encode',
      ffmpeg_stack: 'v6.0.0',
      preset: 'webm',
      width: 1024,
      height: 576,
      resize_strategy: 'pad',
    },
    'webm-realtime': {
      use: ':original',
      robot: '/video/encode',
      ffmpeg_stack: 'v6.0.0',
      preset: 'webm',
      width: 1024,
      height: 576,
      resize_strategy: 'pad',
      ffmpeg: {
        b: '2000K',
        deadline: 'realtime',
      },
    },
    'webm-good': {
      use: ':original',
      robot: '/video/encode',
      ffmpeg_stack: 'v6.0.0',
      preset: 'webm',
      width: 1024,
      height: 576,
      resize_strategy: 'pad',
      ffmpeg: {
        b: '2000K',
        deadline: 'good',
        'cpu-used': '2',
      },
    },
  },
}

const invalidRotateTemplate = {
  steps: {
    import_video: {
      robot: '/http/import',
      url: 'https://tmp-eu-west-1.transloadit.net/example.mp4',
    },
    encode: {
      robot: '/video/encode',
      use: 'import_video',
      ffmpeg_stack: 'v6.0.0',
      preset: 'web/mp4/4k',
      rotate: 355,
    },
  },
} satisfies Record<string, unknown>

const basicImageResizeTemplate: AssemblyInstructionsInput = {
  steps: {
    ':original': {
      robot: '/upload/handle',
    },
    resized: {
      robot: '/image/resize',
      use: ':original',
      width: 1024,
      height: 768,
      resize_strategy: 'fit',
    },
  },
}

const importResizeStoreTemplate: AssemblyInstructionsInput = {
  steps: {
    imported: {
      robot: '/http/import',
      url: 'https://demos.transloadit.com/${fields.input}',
    },
    resized: {
      use: 'imported',
      robot: '/image/resize',
      width: 300,
      height: 200,
    },
    stored: {
      robot: '/s3/store',
      use: ['resized'],
      credentials: 'YOUR_S3_CREDENTIALS',
    },
  },
}

const importServeTemplate: AssemblyInstructionsInput = {
  steps: {
    imported: {
      robot: '/http/import',
      url: 'https://demos.transloadit.com/${fields.input}',
    },
    served: {
      robot: '/file/serve',
      use: 'imported',
    },
  },
}

export const assemblyInstructionFixtures: AssemblyInstructionFixture[] = [
  {
    name: 'ffmpeg-template',
    value: ffmpegTemplate,
    valid: true,
  },
  {
    name: 'rotate-invalid',
    value: invalidRotateTemplate,
    valid: false,
  },
  {
    name: 'basic-image-resize',
    value: basicImageResizeTemplate,
    valid: true,
  },
  {
    name: 'import-resize-store',
    value: importResizeStoreTemplate,
    valid: true,
  },
  {
    name: 'import-serve',
    value: importServeTemplate,
    valid: true,
  },
]
