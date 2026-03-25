import type { z } from 'zod'

import { robotAudioWaveformInstructionsSchema } from '../alphalib/types/robots/audio-waveform.ts'
import { robotDocumentAutorotateInstructionsSchema } from '../alphalib/types/robots/document-autorotate.ts'
import { robotDocumentConvertInstructionsSchema } from '../alphalib/types/robots/document-convert.ts'
import { robotDocumentOptimizeInstructionsSchema } from '../alphalib/types/robots/document-optimize.ts'
import { robotDocumentThumbsInstructionsSchema } from '../alphalib/types/robots/document-thumbs.ts'
import { robotFileCompressInstructionsSchema } from '../alphalib/types/robots/file-compress.ts'
import { robotFileDecompressInstructionsSchema } from '../alphalib/types/robots/file-decompress.ts'
import { robotFilePreviewInstructionsSchema } from '../alphalib/types/robots/file-preview.ts'
import { robotImageBgremoveInstructionsSchema } from '../alphalib/types/robots/image-bgremove.ts'
import { robotImageGenerateInstructionsSchema } from '../alphalib/types/robots/image-generate.ts'
import { robotImageOptimizeInstructionsSchema } from '../alphalib/types/robots/image-optimize.ts'
import { robotImageResizeInstructionsSchema } from '../alphalib/types/robots/image-resize.ts'
import { robotTextSpeakInstructionsSchema } from '../alphalib/types/robots/text-speak.ts'
import { robotVideoThumbsInstructionsSchema } from '../alphalib/types/robots/video-thumbs.ts'

export interface IntentSchemaOptionSpec {
  importName: string
  importPath: string
  keys: string[]
  requiredKeys?: string[]
  schema: z.AnyZodObject
}

export interface IntentInputNoneSpec {
  kind: 'none'
}

export interface IntentInputRemoteUrlSpec {
  description: string
  kind: 'remote-url'
}

export interface IntentInputLocalFilesSpec {
  allowConcurrency?: boolean
  allowSingleAssembly?: boolean
  allowWatch?: boolean
  defaultSingleAssembly?: boolean
  deleteAfterProcessing?: boolean
  description: string
  kind: 'local-files'
  recursive?: boolean
  reprocessStale?: boolean
}

export type IntentInputSpec =
  | IntentInputLocalFilesSpec
  | IntentInputNoneSpec
  | IntentInputRemoteUrlSpec

export interface IntentTemplateExecutionSpec {
  kind: 'template'
  templateId: string
}

export interface IntentSingleStepExecutionSpec {
  fixedValues: Record<string, unknown>
  kind: 'single-step'
  resultStepName: string
}

export interface IntentRemotePreviewExecutionSpec {
  fixedValues: Record<string, unknown>
  importStepName: string
  kind: 'remote-preview'
  previewStepName: string
}

export type IntentExecutionSpec =
  | IntentRemotePreviewExecutionSpec
  | IntentSingleStepExecutionSpec
  | IntentTemplateExecutionSpec

export interface IntentCommandSpec {
  className: string
  description: string
  details?: string
  examples: Array<[string, string]>
  execution: IntentExecutionSpec
  input: IntentInputSpec
  outputDescription: string
  outputRequired: boolean
  paths: string[][]
  schemaOptions?: IntentSchemaOptionSpec
  summary: string
}

const localFileInput = {
  kind: 'local-files',
  description: 'Provide an input file or a directory',
  recursive: true,
  allowWatch: true,
  deleteAfterProcessing: true,
  reprocessStale: true,
  allowSingleAssembly: true,
  allowConcurrency: true,
} satisfies IntentInputLocalFilesSpec

export const intentCommandSpecs = [
  {
    className: 'ImageGenerateCommand',
    summary: 'Generate images from text prompts',
    description: 'Generate an image from a prompt',
    details:
      'Creates a one-off assembly around `/image/generate` and downloads the result to `--out`.',
    paths: [['image', 'generate']],
    input: { kind: 'none' },
    outputDescription: 'Write the generated image to this path',
    outputRequired: true,
    examples: [
      [
        'Generate a PNG image',
        'transloadit image generate --prompt "A red bicycle in a studio" --out bicycle.png',
      ],
      [
        'Pick a model and aspect ratio',
        'transloadit image generate --prompt "An astronaut riding a horse" --model flux-schnell --aspect-ratio 2:3 --out horse.png',
      ],
    ],
    schemaOptions: {
      importName: 'robotImageGenerateInstructionsSchema',
      importPath: '../../alphalib/types/robots/image-generate.ts',
      schema: robotImageGenerateInstructionsSchema,
      keys: ['prompt', 'model', 'format', 'seed', 'aspect_ratio', 'height', 'width', 'style'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'generated_image',
      fixedValues: {
        robot: '/image/generate',
        result: true,
      },
    },
  },
  {
    className: 'PreviewGenerateCommand',
    summary: 'Generate preview thumbnails for remote files',
    description: 'Generate a preview image for a remote file URL',
    details:
      'Imports a remote file with `/http/import`, then runs `/file/preview` and downloads the preview to `--out`.',
    paths: [['preview', 'generate']],
    input: {
      kind: 'remote-url',
      description: 'Remote URL to preview',
    },
    outputDescription: 'Write the generated preview image to this path',
    outputRequired: true,
    examples: [
      [
        'Preview a remote PDF',
        'transloadit preview generate --input https://example.com/file.pdf --width 300 --height 200 --out preview.png',
      ],
      [
        'Pick a format and resize strategy',
        'transloadit preview generate --input https://example.com/file.mp4 --width 640 --height 360 --format jpg --resize-strategy fillcrop --out preview.jpg',
      ],
    ],
    schemaOptions: {
      importName: 'robotFilePreviewInstructionsSchema',
      importPath: '../../alphalib/types/robots/file-preview.ts',
      schema: robotFilePreviewInstructionsSchema,
      keys: ['format', 'width', 'height', 'resize_strategy'],
    },
    execution: {
      kind: 'remote-preview',
      importStepName: 'imported',
      previewStepName: 'preview',
      fixedValues: {
        robot: '/file/preview',
        result: true,
      },
    },
  },
  {
    className: 'ImageRemoveBackgroundCommand',
    summary: 'Remove image backgrounds',
    description: 'Remove the background from an image',
    details: 'Runs `/image/bgremove` on each input image and downloads the result to `--out`.',
    paths: [['image', 'remove-background']],
    input: localFileInput,
    outputDescription: 'Write the background-removed image to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Remove the background from one image',
        'transloadit image remove-background --input portrait.png --out portrait-cutout.png',
      ],
      [
        'Choose the output format',
        'transloadit image remove-background --input portrait.png --format webp --out portrait-cutout.webp',
      ],
    ],
    schemaOptions: {
      importName: 'robotImageBgremoveInstructionsSchema',
      importPath: '../../alphalib/types/robots/image-bgremove.ts',
      schema: robotImageBgremoveInstructionsSchema,
      keys: ['select', 'format', 'provider', 'model'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'removed_background',
      fixedValues: {
        robot: '/image/bgremove',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'ImageOptimizeCommand',
    summary: 'Optimize images',
    description: 'Optimize image file size',
    details: 'Runs `/image/optimize` on each input image and downloads the result to `--out`.',
    paths: [['image', 'optimize']],
    input: localFileInput,
    outputDescription: 'Write the optimized image to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Optimize a single image',
        'transloadit image optimize --input hero.jpg --out hero-optimized.jpg',
      ],
      [
        'Prioritize compression ratio',
        'transloadit image optimize --input hero.jpg --priority compression-ratio --out hero-optimized.jpg',
      ],
    ],
    schemaOptions: {
      importName: 'robotImageOptimizeInstructionsSchema',
      importPath: '../../alphalib/types/robots/image-optimize.ts',
      schema: robotImageOptimizeInstructionsSchema,
      keys: ['priority', 'progressive', 'preserve_meta_data', 'fix_breaking_images'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'optimized',
      fixedValues: {
        robot: '/image/optimize',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'ImageResizeCommand',
    summary: 'Resize images',
    description: 'Resize an image',
    details: 'Runs `/image/resize` on each input image and downloads the result to `--out`.',
    paths: [['image', 'resize']],
    input: localFileInput,
    outputDescription: 'Write the resized image to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Resize an image to 800×600',
        'transloadit image resize --input photo.jpg --width 800 --height 600 --out photo-resized.jpg',
      ],
      [
        'Pad with a transparent background',
        'transloadit image resize --input logo.png --width 512 --height 512 --resize-strategy pad --background none --out logo-square.png',
      ],
    ],
    schemaOptions: {
      importName: 'robotImageResizeInstructionsSchema',
      importPath: '../../alphalib/types/robots/image-resize.ts',
      schema: robotImageResizeInstructionsSchema,
      keys: ['format', 'width', 'height', 'resize_strategy', 'strip', 'background'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'resized',
      fixedValues: {
        robot: '/image/resize',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'DocumentConvertCommand',
    summary: 'Convert documents',
    description: 'Convert a document into another format',
    details:
      'Runs `/document/convert` on each input file and downloads the converted result to `--out`.',
    paths: [['document', 'convert']],
    input: localFileInput,
    outputDescription: 'Write the converted document to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Convert a document to PDF',
        'transloadit document convert --input proposal.docx --format pdf --out proposal.pdf',
      ],
      [
        'Convert markdown using GitHub-flavored markdown',
        'transloadit document convert --input notes.md --format html --markdown-format gfm --out notes.html',
      ],
    ],
    schemaOptions: {
      importName: 'robotDocumentConvertInstructionsSchema',
      importPath: '../../alphalib/types/robots/document-convert.ts',
      schema: robotDocumentConvertInstructionsSchema,
      keys: ['format', 'markdown_format', 'markdown_theme'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'converted',
      fixedValues: {
        robot: '/document/convert',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'DocumentOptimizeCommand',
    summary: 'Optimize PDF documents',
    description: 'Reduce PDF file size',
    details:
      'Runs `/document/optimize` on each input PDF and downloads the optimized result to `--out`.',
    paths: [['document', 'optimize']],
    input: localFileInput,
    outputDescription: 'Write the optimized PDF to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Optimize a PDF with the ebook preset',
        'transloadit document optimize --input report.pdf --preset ebook --out report-optimized.pdf',
      ],
      [
        'Override image DPI',
        'transloadit document optimize --input report.pdf --image-dpi 150 --out report-optimized.pdf',
      ],
    ],
    schemaOptions: {
      importName: 'robotDocumentOptimizeInstructionsSchema',
      importPath: '../../alphalib/types/robots/document-optimize.ts',
      schema: robotDocumentOptimizeInstructionsSchema,
      keys: [
        'preset',
        'image_dpi',
        'compress_fonts',
        'subset_fonts',
        'remove_metadata',
        'linearize',
        'compatibility',
      ],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'optimized',
      fixedValues: {
        robot: '/document/optimize',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'DocumentAutoRotateCommand',
    summary: 'Auto-rotate documents',
    description: 'Correct document page orientation',
    details:
      'Runs `/document/autorotate` on each input file and downloads the corrected document to `--out`.',
    paths: [['document', 'auto-rotate']],
    input: localFileInput,
    outputDescription: 'Write the auto-rotated document to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Auto-rotate a scanned PDF',
        'transloadit document auto-rotate --input scans.pdf --out scans-corrected.pdf',
      ],
    ],
    schemaOptions: {
      importName: 'robotDocumentAutorotateInstructionsSchema',
      importPath: '../../alphalib/types/robots/document-autorotate.ts',
      schema: robotDocumentAutorotateInstructionsSchema,
      keys: [],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'autorotated',
      fixedValues: {
        robot: '/document/autorotate',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'DocumentThumbsCommand',
    summary: 'Extract document thumbnails',
    description: 'Render thumbnails from a document',
    details:
      'Runs `/document/thumbs` on each input document and writes the extracted pages or animated GIF to `--out`.',
    paths: [['document', 'thumbs']],
    input: localFileInput,
    outputDescription: 'Write the extracted document thumbnails to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Extract PNG thumbnails from every page',
        'transloadit document thumbs --input brochure.pdf --width 240 --out thumbs/',
      ],
      [
        'Generate an animated GIF preview',
        'transloadit document thumbs --input brochure.pdf --format gif --delay 50 --out brochure.gif',
      ],
    ],
    schemaOptions: {
      importName: 'robotDocumentThumbsInstructionsSchema',
      importPath: '../../alphalib/types/robots/document-thumbs.ts',
      schema: robotDocumentThumbsInstructionsSchema,
      keys: [
        'page',
        'format',
        'delay',
        'width',
        'height',
        'resize_strategy',
        'background',
        'trim_whitespace',
        'pdf_use_cropbox',
      ],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'thumbnailed',
      fixedValues: {
        robot: '/document/thumbs',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'AudioWaveformCommand',
    summary: 'Generate audio waveforms',
    description: 'Generate a waveform image from audio',
    details:
      'Runs `/audio/waveform` on each input audio file and downloads the waveform to `--out`.',
    paths: [['audio', 'waveform']],
    input: localFileInput,
    outputDescription: 'Write the waveform image or JSON data to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Generate a waveform PNG',
        'transloadit audio waveform --input podcast.mp3 --width 1200 --height 300 --out waveform.png',
      ],
      [
        'Generate waveform JSON',
        'transloadit audio waveform --input podcast.mp3 --format json --out waveform.json',
      ],
    ],
    schemaOptions: {
      importName: 'robotAudioWaveformInstructionsSchema',
      importPath: '../../alphalib/types/robots/audio-waveform.ts',
      schema: robotAudioWaveformInstructionsSchema,
      keys: [
        'format',
        'width',
        'height',
        'style',
        'background_color',
        'center_color',
        'outer_color',
      ],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'waveformed',
      fixedValues: {
        robot: '/audio/waveform',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'TextSpeakCommand',
    summary: 'Synthesize speech from text',
    description: 'Turn a text prompt into spoken audio',
    details: 'Runs `/text/speak` with a prompt and downloads the synthesized audio to `--out`.',
    paths: [['text', 'speak']],
    input: { kind: 'none' },
    outputDescription: 'Write the synthesized audio to this path',
    outputRequired: true,
    examples: [
      [
        'Speak a sentence in American English',
        'transloadit text speak --prompt "Hello world" --provider aws --target-language en-US --out hello.mp3',
      ],
      [
        'Use a different voice',
        'transloadit text speak --prompt "Bonjour tout le monde" --provider aws --target-language fr-FR --voice female-2 --out bonjour.mp3',
      ],
    ],
    schemaOptions: {
      importName: 'robotTextSpeakInstructionsSchema',
      importPath: '../../alphalib/types/robots/text-speak.ts',
      schema: robotTextSpeakInstructionsSchema,
      keys: ['prompt', 'provider', 'target_language', 'voice', 'ssml'],
      requiredKeys: ['prompt'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'synthesized',
      fixedValues: {
        robot: '/text/speak',
        result: true,
      },
    },
  },
  {
    className: 'VideoThumbsCommand',
    summary: 'Extract video thumbnails',
    description: 'Extract thumbnails from a video',
    details: 'Runs `/video/thumbs` on each input video and writes the extracted images to `--out`.',
    paths: [['video', 'thumbs']],
    input: localFileInput,
    outputDescription: 'Write the extracted video thumbnails to this path or directory',
    outputRequired: true,
    examples: [
      [
        'Extract eight thumbnails',
        'transloadit video thumbs --input demo.mp4 --count 8 --out thumbs/',
      ],
      [
        'Resize thumbnails to PNG',
        'transloadit video thumbs --input demo.mp4 --count 5 --format png --width 640 --out thumbs/',
      ],
    ],
    schemaOptions: {
      importName: 'robotVideoThumbsInstructionsSchema',
      importPath: '../../alphalib/types/robots/video-thumbs.ts',
      schema: robotVideoThumbsInstructionsSchema,
      keys: ['count', 'format', 'width', 'height', 'resize_strategy', 'background', 'rotate'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'thumbnailed',
      fixedValues: {
        robot: '/video/thumbs',
        result: true,
        use: ':original',
      },
    },
  },
  {
    className: 'VideoEncodeHlsCommand',
    summary: 'Encode videos to HLS',
    description: 'Encode a video into an HLS package',
    details:
      'Runs the `builtin/encode-hls-video@latest` builtin template and downloads the HLS outputs into `--out`.',
    paths: [['video', 'encode-hls']],
    input: localFileInput,
    outputDescription: 'Write the HLS outputs into this directory',
    outputRequired: true,
    examples: [
      ['Encode a single video', 'transloadit video encode-hls --input input.mp4 --out dist/hls'],
      [
        'Process a directory recursively',
        'transloadit video encode-hls --input videos/ --out dist/hls --recursive',
      ],
    ],
    execution: {
      kind: 'template',
      templateId: 'builtin/encode-hls-video@latest',
    },
  },
  {
    className: 'FileCompressCommand',
    summary: 'Compress files into an archive',
    description: 'Create an archive from one or more files',
    details:
      'Runs `/file/compress` and writes the resulting archive to `--out`. Multiple inputs are bundled into one archive by default.',
    paths: [['file', 'compress']],
    input: {
      kind: 'local-files',
      description: 'Provide one or more input files or directories',
      recursive: true,
      deleteAfterProcessing: true,
      reprocessStale: true,
      defaultSingleAssembly: true,
    },
    outputDescription: 'Write the generated archive to this path',
    outputRequired: true,
    examples: [
      [
        'Create a ZIP archive',
        'transloadit file compress --input assets/ --format zip --out assets.zip',
      ],
      [
        'Create a gzipped tarball',
        'transloadit file compress --input assets/ --format tar --gzip true --out assets.tar.gz',
      ],
    ],
    schemaOptions: {
      importName: 'robotFileCompressInstructionsSchema',
      importPath: '../../alphalib/types/robots/file-compress.ts',
      schema: robotFileCompressInstructionsSchema,
      keys: ['format', 'gzip', 'password', 'compression_level', 'file_layout', 'archive_name'],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'compressed',
      fixedValues: {
        robot: '/file/compress',
        result: true,
        use: {
          steps: [':original'],
          bundle_steps: true,
        },
      },
    },
  },
  {
    className: 'FileDecompressCommand',
    summary: 'Extract archive contents',
    description: 'Decompress an archive',
    details:
      'Runs `/file/decompress` on each input archive and writes the extracted files to `--out`.',
    paths: [['file', 'decompress']],
    input: localFileInput,
    outputDescription: 'Write the extracted files to this directory',
    outputRequired: true,
    examples: [
      [
        'Decompress a ZIP archive',
        'transloadit file decompress --input assets.zip --out extracted/',
      ],
    ],
    schemaOptions: {
      importName: 'robotFileDecompressInstructionsSchema',
      importPath: '../../alphalib/types/robots/file-decompress.ts',
      schema: robotFileDecompressInstructionsSchema,
      keys: [],
    },
    execution: {
      kind: 'single-step',
      resultStepName: 'decompressed',
      fixedValues: {
        robot: '/file/decompress',
        result: true,
        use: ':original',
      },
    },
  },
] as const satisfies readonly IntentCommandSpec[]
