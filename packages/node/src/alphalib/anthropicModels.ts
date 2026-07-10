export const CLAUDE_SONNET_4_CURRENT = 'claude-sonnet-4-6'
export const CLAUDE_OPUS_4_CURRENT = 'claude-opus-4-8'

const anthropicModelAliases = new Map([
  ['claude-4-sonnet-20250514', CLAUDE_SONNET_4_CURRENT],
  ['claude-sonnet-4-20250514', CLAUDE_SONNET_4_CURRENT],
  ['claude-4-opus-20250514', CLAUDE_OPUS_4_CURRENT],
  ['claude-opus-4-20250514', CLAUDE_OPUS_4_CURRENT],
])

export function normalizeAnthropicModel(model: string): string {
  return anthropicModelAliases.get(model) ?? model
}
