import type { RobotVideoGenerateInstructions } from './video-generate.ts'

import { videoGenerateDefaultModelIdentifier } from './_ai-models.ts'

// Keep the schema wording portable without exposing the server's provider policy to SDKs.
export { videoGenerationParameterEnforcementDate } from './_video-generate-description.ts'

const optionalVideoParameters = [
  'seed',
  'aspect_ratio',
  'height',
  'width',
  'style',
  'duration',
  'fps',
  'motion_amount',
  'camera_motion',
  'negative_prompt',
  'reference_strength',
] satisfies (keyof RobotVideoGenerateInstructions)[]

const ltxAspectRatioError = 'aspect_ratio must be a nonempty string for lightricks/ltx-video.'

/** Stable code included in Assembly warning text and structured server logs. */
export const videoGenerationParameterWarningCode = 'VIDEO_GENERATE_PARAMETER_IGNORED'

/** Flip this one flag on the enforcement date; both policy paths have regression coverage. */
export const videoGenerationParameterValidation = { enforceUnsupportedParameters: false }

type VideoGenerationParameters = Pick<
  RobotVideoGenerateInstructions,
  'model' | 'prompt' | (typeof optionalVideoParameters)[number]
>

interface VideoGenerationModel {
  replicateModel: `${string}/${string}`
  parameters: readonly (typeof optionalVideoParameters)[number][]
  imageInput?: string
  imageMimeTypes?: readonly string[]
  requiresImage?: boolean
}

// https://platform.minimax.io/docs/api-reference/video-generation-i2v#body-first-frame-image
const minimaxImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

/** Verified Replicate video capabilities; model schemas do not accept a generic video input. */
// Unavailable luma/ray and image-only luma/photon stay excluded in both modes. The transition
// applies to ignored settings on supported video models, preserving the other validation fixes.
export const videoGenerationModels: Record<string, VideoGenerationModel> = {
  // https://replicate.com/minimax/video-01/api/schema: fixed six-second output, no duration input.
  'minimax/video-01': {
    replicateModel: 'minimax/video-01',
    parameters: [],
    imageInput: 'first_frame_image',
    imageMimeTypes: minimaxImageMimeTypes,
  },
  'minimax/video-01-live': {
    replicateModel: 'minimax/video-01-live',
    parameters: [],
    imageInput: 'first_frame_image',
    imageMimeTypes: minimaxImageMimeTypes,
    requiresImage: true,
  },
  // https://replicate.com/tencent/hunyuan-video/api/schema: length is specified in frames.
  'tencent/hunyuan-video': {
    replicateModel: 'tencent/hunyuan-video',
    parameters: ['seed', 'height', 'width', 'fps'],
  },
  // https://replicate.com/lightricks/ltx-video/api/schema: length is specified in frames.
  'lightricks/ltx-video': {
    replicateModel: 'lightricks/ltx-video',
    parameters: ['seed', 'aspect_ratio', 'negative_prompt'],
    imageInput: 'image',
  },
}

/** Looks up only configured model names, excluding inherited object properties. */
export function getVideoGenerationModel(model: string): VideoGenerationModel | undefined {
  return Object.hasOwn(videoGenerationModels, model) ? videoGenerationModels[model] : undefined
}

/** Identifies known unsupported frame formats without rejecting legacy CLI inputs lacking MIME. */
export function getVideoGenerationImageFormatError(
  modelName: string,
  mime: string | null | undefined,
): string | undefined {
  const supported = getVideoGenerationModel(modelName)?.imageMimeTypes
  if (!mime || !supported || supported.includes(mime)) return undefined
  return `Model ${modelName} supports only JPEG, PNG, or WebP input images. Convert the image before using it.`
}

/** Shares safe value constraints between migration warnings and later enforcement errors. */
export function getPreviouslyOmittedVideoGenerationValueError(
  instructions: VideoGenerationParameters,
  parameter: (typeof optionalVideoParameters)[number],
  hasImage: boolean,
): string | undefined {
  if (instructions.model === 'tencent/hunyuan-video') {
    if (
      parameter === 'fps' &&
      instructions.fps != null &&
      (!Number.isInteger(instructions.fps) || instructions.fps < 1)
    ) {
      return 'fps must be a positive integer for tencent/hunyuan-video.'
    }
    if (parameter === 'height' || parameter === 'width') {
      const value = instructions[parameter]
      if (value != null && (value < 16 || value > 1280 || value % 16 !== 0)) {
        return `${parameter} must be a multiple of 16 between 16 and 1280 for tencent/hunyuan-video.`
      }
    }
  }
  if (
    instructions.model === 'lightricks/ltx-video' &&
    parameter === 'aspect_ratio' &&
    !hasImage &&
    instructions.aspect_ratio === ''
  ) {
    return ltxAspectRatioError
  }
  return undefined
}

/** Enumerates ignored scalar settings without including customer-supplied values. */
export function getUnsupportedVideoGenerationParameters(
  instructions: VideoGenerationParameters,
  hasImage = false,
): (typeof optionalVideoParameters)[number][] {
  const model = getVideoGenerationModel(instructions.model ?? videoGenerateDefaultModelIdentifier)
  if (!model) return []
  return optionalVideoParameters.filter(
    (parameter) =>
      instructions[parameter] != null &&
      (!model.parameters.includes(parameter) ||
        (hasImage && parameter === 'aspect_ratio') ||
        getPreviouslyOmittedVideoGenerationValueError(instructions, parameter, hasImage) != null),
  )
}

/** Enforces model constraints and, after the transition, rejects ignored scalar settings. */
export function getVideoGenerationParameterError(
  instructions: VideoGenerationParameters,
  hasImage = false,
): string | undefined {
  const modelName = instructions.model ?? videoGenerateDefaultModelIdentifier
  const model = getVideoGenerationModel(modelName)
  if (!model) return `Model ${modelName} is not supported for video generation.`
  const unsupported = getUnsupportedVideoGenerationParameters(instructions, hasImage)
  if (videoGenerationParameterValidation.enforceUnsupportedParameters && unsupported.length > 0) {
    const parameter = unsupported[0]
    const valueError = getPreviouslyOmittedVideoGenerationValueError(
      instructions,
      parameter,
      hasImage,
    )
    if (valueError) return valueError
    const imageConstraint =
      hasImage && parameter === 'aspect_ratio' && model.parameters.includes(parameter)
        ? ' with an input image'
        : ''
    return `Model ${modelName} does not support ${parameter}${imageConstraint}. Omit this parameter or select a model that supports it.`
  }
  // Whitespace was forwarded before this change, unlike the previously omitted empty string.
  if (
    modelName === 'lightricks/ltx-video' &&
    !hasImage &&
    instructions.aspect_ratio != null &&
    instructions.aspect_ratio !== '' &&
    instructions.aspect_ratio.trim() === ''
  ) {
    return ltxAspectRatioError
  }
  return undefined
}

/** Requires necessary images immediately; unsupported inputs share the compatibility window. */
export function getVideoGenerationImageError(
  instructions: Pick<VideoGenerationParameters, 'model' | 'aspect_ratio'>,
  hasImage: boolean,
): string | undefined {
  const modelName = instructions.model ?? videoGenerateDefaultModelIdentifier
  const model = getVideoGenerationModel(modelName)
  if (!model) return `Model ${modelName} is not supported for video generation.`
  if (model.requiresImage && !hasImage) return `Model ${modelName} requires an input image.`
  if (
    videoGenerationParameterValidation.enforceUnsupportedParameters &&
    hasImage &&
    !model.imageInput
  ) {
    return `Model ${modelName} does not support an input image.`
  }
  return undefined
}

/** Builds only model-supported provider fields, preserving explicit zero values. */
export function buildVideoGenerationInput(
  instructions: VideoGenerationParameters,
  hasImage = false,
): Record<string, unknown> {
  const error = getVideoGenerationParameterError(instructions, hasImage)
  if (error) throw new Error(error)
  const model = getVideoGenerationModel(instructions.model ?? videoGenerateDefaultModelIdentifier)
  if (!model) throw new Error('Missing video generation model configuration.')
  const unsupported = getUnsupportedVideoGenerationParameters(instructions, hasImage)
  const input: Record<string, unknown> = { prompt: instructions.prompt }
  for (const parameter of model.parameters) {
    const value = instructions[parameter]
    if (value != null && !unsupported.includes(parameter)) input[parameter] = value
  }
  return input
}
