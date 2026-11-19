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

interface PreviousContract {
  /** Parameters this contract added: passed through as written, never validated or defaulted. */
  added?: readonly string[]
  /** Defaults this contract changed or removed: the previous value applies when omitted. */
  apply?: Readonly<Record<string, string>>
}

/**
 * Robot parameters and defaults changed by contract syncs within this major. `auth signature`
 * and `templates sync` emit default-filled Steps, so the new contract would change signed params
 * and synced Templates for unchanged input. Parameters added to an existing Robot were unknown
 * keys before and were forwarded unchanged for API validation, so they still are. Every applied
 * value is still accepted by the contract. The next major removes this list and emits the
 * current contract.
 */
const previousContract: ReadonlyMap<string, PreviousContract> = new Map<string, PreviousContract>([
  ['/document/thumbs', { apply: { imagemagick_stack: 'v2.0.10' } }],
  ['/file/serve', { added: ['download'] }],
  ['/image/enhance', { apply: { imagemagick_stack: 'v2.0.10' } }],
  ['/image/generate', { added: ['inpainting'] }],
  ['/image/resize', { apply: { imagemagick_stack: 'v2.0.10' } }],
  ['/speech/transcribe', { added: ['credentials'] }],
  ['/text/speak', { added: ['credentials'] }],
  ['/transloadit/import', { added: ['return_file_stubs'] }],
  ['/video/merge', { apply: { framerate: '1/5' } }],
  ['/video/subtitle', { added: ['speaker_colors'] }],
])

type CliStep = { robot: string } & Record<string, unknown>

function toPreviousContractInput(step: CliStep): CliStep {
  const { added = [], apply = {} } = previousContract.get(step.robot) ?? {}
  const kept = Object.entries(step).filter(([key]) => !added.includes(key))
  // Parsed as input, each value lands where the schema orders its keys, as the old default did.
  const missing = Object.entries(apply).filter(([key]) => !Object.hasOwn(step, key))
  return { robot: step.robot, ...Object.fromEntries([...kept, ...missing]) }
}

function fromPreviousContractOutput(
  step: CliStep,
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const { added = [] } = previousContract.get(step.robot) ?? {}
  const omitted = new Set(added)
  // The `en-US` default describes aws and gcp; ElevenLabs is new and detects the language when
  // it is omitted, so an explicit default would turn detection off.
  if (
    step.robot === '/speech/transcribe' &&
    parsed.provider === 'elevenlabs' &&
    !Object.hasOwn(step, 'source_language')
  ) {
    omitted.add('source_language')
  }
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => !omitted.has(key)))
}

interface CliStepsSchemaOptions {
  /** Emit Steps as the previous contract did; see `previousContract`. */
  previousContract?: boolean
}

/** CLI overrides warn on new parameters and defer contextual OCR checks to API2. */
export function createCliStepsSchema(
  output: Pick<IOutputCtl, 'warn'> = console,
  options: CliStepsSchemaOptions = {},
): z.ZodType<StepsInput> {
  const cliStepSchema = z
    .object({ robot: z.string() })
    .catchall(z.unknown())
    .transform((step, context) => {
      const input = options.previousContract ? toPreviousContractInput(step) : step
      let validated = robotsSchema.safeParse(input, { path: context.path })
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
            Object.fromEntries(Object.entries(input).filter(([key]) => !unknownKeys.has(key))),
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
          `${context.path.join('.')}: Unrecognized step parameters: ${[...unknownKeys].join(', ')}. Preserving them for API validation when submitted.`,
        )
      }
      const parsed = options.previousContract
        ? fromPreviousContractOutput(step, validated.data)
        : validated.data
      return { ...step, ...parsed }
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
