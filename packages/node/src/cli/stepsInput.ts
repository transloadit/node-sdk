import type { StepsInput } from '../alphalib/types/template.ts'
import type { IOutputCtl } from './OutputCtl.ts'

import fsp from 'node:fs/promises'

import { z } from 'zod'

import { tryCatch } from '../alphalib/tryCatch.ts'
import { robotsSchema } from '../alphalib/types/robots/_index.ts'
import { refineDocumentExtractOcr } from '../alphalib/types/robots/document-extract.ts'
import { refineTransloaditImportSelector } from '../alphalib/types/robots/transloadit-import.ts'
import { CliInputError, formatSchemaIssues } from './errors.ts'

const stepsWrapperSchema = z.object({ steps: z.record(z.unknown()) })

/** CLI overrides warn on new parameters and defer contextual OCR checks to API2. */
export function createCliStepsSchema(
  output: Pick<IOutputCtl, 'warn'> = console,
): z.ZodType<StepsInput> {
  const cliStepSchema = z
    .object({ robot: z.string() })
    .catchall(z.unknown())
    .transform((step, context) => {
      let validated = robotsSchema.safeParse(step, { path: context.path })
      const unknownKeys = new Set<string>()
      if (!validated.success) {
        for (const issue of validated.error.issues) {
          // Only new top-level Robot parameters are advisory; nested objects stay strict.
          if (issue.code !== 'unrecognized_keys' || issue.path.length !== context.path.length)
            continue
          for (const key of issue.keys) unknownKeys.add(key)
        }
        if (unknownKeys.size > 0) {
          validated = robotsSchema.safeParse(
            Object.fromEntries(Object.entries(step).filter(([key]) => !unknownKeys.has(key))),
            { path: context.path },
          )
        }
      }
      if (!validated.success) {
        for (const issue of validated.error.issues) {
          // Keep nested union diagnostics rooted at the Step while addIssue prefixes its own path.
          context.addIssue({ ...issue, path: issue.path.slice(context.path.length) })
        }
        return z.NEVER
      }
      if (unknownKeys.size > 0) {
        output.warn(
          `${context.path.join('.')}: Unrecognized step parameters: ${[...unknownKeys].join(', ')}. Passing them to the API for validation.`,
        )
      }
      return { ...step, ...validated.data }
    })
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
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    throw new CliInputError('Invalid steps format: expected valid JSON', { cause: error })
  }
  const wrapped = stepsWrapperSchema.safeParse(parsed)
  let stepsInput = parsed
  // A step named “steps” has a robot, unlike the top-level instructions wrapper.
  if (wrapped.success && typeof wrapped.data.steps.robot !== 'string') {
    // --steps only supplies steps; other instructions must not be silently discarded.
    const validatedWrapper = stepsWrapperSchema.strict().safeParse(parsed)
    if (!validatedWrapper.success) {
      throw new CliInputError(
        `Invalid steps format: ${formatSchemaIssues(validatedWrapper.error.issues)}`,
        { cause: validatedWrapper.error },
      )
    }
    stepsInput = validatedWrapper.data.steps
  }
  const validated = createCliStepsSchema(output).safeParse(stepsInput)
  if (!validated.success) {
    throw new CliInputError(`Invalid steps format: ${formatSchemaIssues(validated.error.issues)}`, {
      cause: validated.error,
    })
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
  const [error, content] = await tryCatch(fsp.readFile(filePath, 'utf8'))
  if (error) {
    throw new CliInputError(`Cannot read steps input: ${error.message}`, { cause: error })
  }
  return parseStepsInputJson(content, output)
}
