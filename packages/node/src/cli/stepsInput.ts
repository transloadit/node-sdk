import fsp from 'node:fs/promises'

import type { StepsInput } from '../alphalib/types/template.ts'
import { stepsSchema } from '../alphalib/types/template.ts'

export function parseStepsInputJson(content: string): StepsInput {
  const parsed: unknown = JSON.parse(content)
  const validated = stepsSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid steps format: ${validated.error.message}`)
  }

  const parsedSteps = parsed as Record<string, Record<string, unknown>>
  const validatedSteps = validated.data as Record<string, Record<string, unknown>>

  return Object.fromEntries(
    Object.entries(parsedSteps).map(([stepName, stepInput]) => {
      const normalizedStep = validatedSteps[stepName] ?? {}
      return [
        stepName,
        Object.fromEntries(
          Object.keys(stepInput).map((key) => [key, normalizedStep[key] ?? stepInput[key]]),
        ),
      ]
    }),
  ) as StepsInput
}

export async function readStepsInputFile(filePath: string): Promise<StepsInput> {
  const content = await fsp.readFile(filePath, 'utf8')
  return parseStepsInputJson(content)
}
