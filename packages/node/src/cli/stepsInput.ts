import type { StepsInput } from '../alphalib/types/template.ts'
import type { IOutputCtl } from './OutputCtl.ts'

import fsp from 'node:fs/promises'

import { z } from 'zod'

import { robotsSchema } from '../alphalib/types/robots/_index.ts'
import { refineDocumentExtractOcr } from '../alphalib/types/robots/document-extract.ts'
import { refineTransloaditImportSelector } from '../alphalib/types/robots/transloadit-import.ts'

const stepsWrapperSchema = z.object({ steps: z.record(z.unknown()) })

/** CLI inputs can be partial overrides; API2 validates OCR after merging their runtime context. */
export function createCliStepsSchema(
  output: Pick<IOutputCtl, 'warn'> = console,
): z.ZodType<StepsInput> {
  const cliStepSchema = robotsSchema
    .superRefine(refineTransloaditImportSelector)
    .superRefine((step, context) => {
      // API2 merges Template defaults before Robot validation. New OCR checks must not reject
      // partial --steps overrides in a minor release; explicit Zod schemas remain strict.
      refineDocumentExtractOcr(step, {
        ...context,
        addIssue(issue) {
          const field = [...context.path, ...(issue.path ?? [])].join('.')
          output.warn(`${field}: ${issue.message ?? 'Invalid OCR dependency.'}`)
        },
      })
    })
  return z.record(cliStepSchema)
}

export function parseStepsInputJson(
  content: string,
  output: Pick<IOutputCtl, 'warn'> = console,
): StepsInput {
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
  const validated = createCliStepsSchema(output).safeParse(stepsInput)
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

export async function readStepsInputFile(
  filePath: string,
  output: Pick<IOutputCtl, 'warn'> = console,
): Promise<StepsInput> {
  const content = await fsp.readFile(filePath, 'utf8')
  return parseStepsInputJson(content, output)
}
