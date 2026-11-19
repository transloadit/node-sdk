import { imageGenerateModelIdentifiers } from './_ai-models.ts'

/** Models with a supported image-editing route and mask normalization. */
export const imageGenerateInpaintingModels: readonly string[] = [
  ...imageGenerateModelIdentifiers.filter(
    (model) => model.startsWith('google/') || model.startsWith('openai/'),
  ),
  'gpt-image-2',
  'stability-ai/stable-diffusion-inpainting',
]

/** Strict frame classification; unclassified decoders cannot establish a still raster. */
export const imageGenerateFrameRules = [
  ['still', ['bmp', 'ico', 'jp2', 'jpeg', 'ppm', 'rad']],
  ['pages', ['avif', 'gif', 'heic', 'heif', 'jxl', 'tiff', 'webp']],
  ['vector', ['eps', 'pdf', 'ps', 'svg']],
  ['png', ['png']],
] satisfies [rule: 'pages' | 'still' | 'png' | 'vector', formats: string[]][]

/** Resolves supported OpenAI image IDs, including native aliases accepted by the CLI. */
export function getOpenAiImageApiModel(model: string): string | undefined {
  const canonical = model.includes('/') ? model : `openai/${model}`
  return canonical.startsWith('openai/') && imageGenerateInpaintingModels.includes(canonical)
    ? canonical.slice('openai/'.length)
    : undefined
}
