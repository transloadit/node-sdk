import type { StepsInput } from '../alphalib/types/template.ts'

import fsp from 'node:fs/promises'

import { z } from 'zod'

import { stepsSchema } from '../alphalib/types/template.ts'

const stepsWrapperSchema = z.object({ steps: z.record(z.unknown()) })

export function parseStepsInputJson(content: string): StepsInput {
  const parsed: unknown = JSON.parse(content)
  const wrapped = stepsWrapperSchema.safeParse(parsed)
  let stepsInput = parsed
  // A step named “steps” has a robot, unlike the top-level instructions wrapper.
  if (wrapped.success && typeof wrapped.data.steps.robot !== 'string') {
    // --steps only supplies steps; other instructions must not be silently discarded.
    const validatedWrapper = stepsWrapperSchema.strict().safeParse(parsed)
    if (!validatedWrapper.success) {
      throw new Error(`Invalid steps format: ${validatedWrapper.error.message}`)
    }
    stepsInput = validatedWrapper.data.steps
  }
  const validated = stepsSchema.safeParse(stepsInput)
  if (!validated.success) {
    throw new Error(`Invalid steps format: ${validated.error.message}`)
  }

  const parsedSteps = stepsInput as Record<string, Record<string, unknown>>
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
