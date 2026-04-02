import fsp from 'node:fs/promises'

import type { StepsInput } from '../alphalib/types/template.ts'
import { stepsSchema } from '../alphalib/types/template.ts'

export function parseStepsInputJson(content: string): StepsInput {
  const parsed: unknown = JSON.parse(content)
  const validated = stepsSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid steps format: ${validated.error.message}`)
  }

  // Preserve the original input shape so we do not leak zod defaults into API payloads.
  return parsed as StepsInput
}

export async function readStepsInputFile(filePath: string): Promise<StepsInput> {
  const content = await fsp.readFile(filePath, 'utf8')
  return parseStepsInputJson(content)
}
