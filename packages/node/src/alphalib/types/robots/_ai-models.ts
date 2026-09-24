/**
 * Transloadit's supported /ai/chat models and their input capabilities.
 * This is intentionally not a complete vendor catalog: add models only after runtime behavior,
 * pricing, and file handling have been reviewed.
 */
export const MODEL_CAPABILITIES: Readonly<Record<string, { pdf: boolean; image: boolean }>> =
  Object.freeze({
    'anthropic/claude-sonnet-4-6': { pdf: true, image: true },
    'anthropic/claude-4-sonnet-20250514': { pdf: true, image: true },
    'anthropic/claude-sonnet-4-20250514': { pdf: true, image: true },
    'anthropic/claude-opus-4-8': { pdf: true, image: true },
    'anthropic/claude-opus-5': { pdf: true, image: true },
    'anthropic/claude-opus-5-5': { pdf: true, image: true },
    'anthropic/claude-4-opus-20250514': { pdf: true, image: true },
    'anthropic/claude-opus-4-20250514': { pdf: true, image: true },
    'anthropic/claude-sonnet-4-5': { pdf: true, image: true },
    'anthropic/claude-opus-4-5': { pdf: true, image: true },
    'anthropic/claude-opus-4-6': { pdf: true, image: true },
    'anthropic/claude-opus-4-7': { pdf: true, image: true },
    'anthropic/claude-fable-5': { pdf: true, image: true },
    'anthropic/claude-fable-5-1': { pdf: true, image: true },
    'anthropic/claude-sonnet-5': { pdf: true, image: true },
    'openai/gpt-4.1-2025-04-14': { pdf: false, image: true },
    'openai/chatgpt-4o-latest': { pdf: false, image: true },
    'openai/o3-2025-04-16': { pdf: false, image: true },
    'openai/gpt-audio': { pdf: false, image: false },
    'openai/gpt-audio-2025-08-28': { pdf: false, image: false },
    'openai/gpt-4o-audio-preview': { pdf: false, image: false },
    'openai/gpt-5.2': { pdf: false, image: true },
    'openai/gpt-5.2-2025-12-11': { pdf: false, image: true },
    'openai/gpt-5.2-chat-latest': { pdf: false, image: true },
    'openai/gpt-5.2-pro': { pdf: false, image: true },
    'openai/gpt-5.5': { pdf: false, image: true },
    'openai/gpt-5.6-sol': { pdf: false, image: true },
    'openai/gpt-6-astra': { pdf: false, image: true },
    'openai/gpt-5.4': { pdf: false, image: true },
    'openai/gpt-5.4-mini': { pdf: false, image: true },
    'openai/gpt-5.4-nano': { pdf: false, image: true },
    'google/gemini-2.5-pro': { pdf: true, image: true },
    'moonshot/kimi-k2': { pdf: false, image: false },
  })

/** Default /ai/chat model used when `model` is `auto` or omitted. */
export const AI_CHAT_DEFAULT_MODEL = 'openai/gpt-6-astra' satisfies keyof typeof MODEL_CAPABILITIES

/** Public model identifiers accepted by the image generation Robot. */
export const imageGenerateModelIdentifiers = [
  'flux-1.1-pro-ultra',
  'flux-schnell',
  'recraft-v3',
  'google/nano-banana',
  'google/nano-banana-2',
  'google/nano-banana-pro',
  'openai/gpt-image-2',
  'openai/gpt-image-2.5-flare',
  'openai/gpt-image-2.5-sunburst',
  'stability-ai/stable-diffusion-inpainting',
] as const

/** Default public model identifier used by the image generation Robot. */
export const imageGenerateDefaultModelIdentifier =
  'openai/gpt-image-2.5-flare' satisfies (typeof imageGenerateModelIdentifiers)[number]

/** Backwards-compatible public alias accepted by the image generation Robot. */
export const imageGenerateLegacyModelAlias = 'gpt-image-2'

/** Backwards-compatible public aliases accepted by the image generation Robot. */
export const imageGenerateModelAliases = [imageGenerateLegacyModelAlias] as const

/** Public model identifiers accepted by the image upscaling Robot. */
export const imageUpscaleModelIdentifiers = [
  'nightmareai/real-esrgan',
  'tencentarc/gfpgan',
  'sczhou/codeformer',
] as const

/** Default public model identifier used by the image upscaling Robot. */
export const imageUpscaleDefaultModelIdentifier =
  'nightmareai/real-esrgan' satisfies (typeof imageUpscaleModelIdentifiers)[number]

/** Default public model identifier used by the video generation Robot. */
export const videoGenerateDefaultModelIdentifier = 'minimax/video-01'

/** Public model identifiers and aliases protected byte-identically during translation. */
export const publicModelIdentifiers = [
  ...Object.keys(MODEL_CAPABILITIES),
  ...imageGenerateModelAliases,
  ...imageGenerateModelIdentifiers,
  ...imageUpscaleModelIdentifiers,
  videoGenerateDefaultModelIdentifier,
]
