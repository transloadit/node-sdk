import type { AssemblyInstructionsInput } from '../types/template.ts'

export type GoldenTemplate = {
  slug: string
  version: string
  description: string
  steps: AssemblyInstructionsInput['steps']
}

export type GoldenTemplateDefinition = GoldenTemplate
