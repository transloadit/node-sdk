import type { z } from 'zod'

export type ZodIssueWithContext = z.ZodIssue & {
  parentObj: unknown
  humanReadable: string
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export type ZodParseWithContextResult<T extends z.ZodType> = {
  errors: ZodIssueWithContext[]
  humanReadable: string
} & (
  | {
      success: true
      safe: z.infer<T>
    }
  | {
      success: false
      safe?: never
    }
)

export function zodParseWithContext<T extends z.ZodType>(
  schema: T,
  obj: unknown,
): ZodParseWithContextResult<T> {
  const zodRes = schema.safeParse(obj)
  if (!zodRes.success) {
    // Check for empty object input causing a general union failure
    if (
      typeof obj === 'object' &&
      obj !== null &&
      Object.keys(obj).length === 0 &&
      zodRes.error.errors.length > 0
    ) {
      // console.log('[zodParseWithContext] Empty object detected, Zod errors:', JSON.stringify(zodRes.error.errors, null, 2));

      const firstError = zodRes.error.errors[0]
      if (
        zodRes.error.errors.length === 1 &&
        firstError &&
        firstError.code === 'invalid_union' &&
        firstError.path.length === 0 &&
        Array.isArray((firstError as z.ZodInvalidUnionIssue).unionErrors) &&
        (firstError as z.ZodInvalidUnionIssue).unionErrors.length > 0
      ) {
        const humanReadable =
          'Validation failed: Input object is empty or missing key fields required to determine its type, ' +
          'and does not match any variant of the expected schema. Please provide a valid object.'
        return {
          success: false,
          // For this specific summarized error, we might not need to map all detailed ZodIssueWithContext
          // or we can provide a simplified single error entry reflecting this summary.
          // For now, let's return the original errors but with the new top-level humanReadable.
          errors: zodRes.error.errors.map((e) => ({
            ...e,
            parentObj: obj,
            humanReadable: e.message,
          })),
          humanReadable,
        }
      }
    }

    const zodIssuesWithContext: ZodIssueWithContext[] = []
    const badPaths = new Map<string, string[]>()

    for (const zodIssue of zodRes.error.errors) {
      const lastPath = zodIssue.path
      let parentObj: unknown = {}

      if (lastPath) {
        const strPath = lastPath.slice(0, -1).join('.')
        parentObj = getByPath(obj, strPath) ?? {}
      }

      const path = zodIssue.path
        .map((p) => (typeof p === 'string' ? p.replaceAll('.', '\\.') : p))
        .join('.')
      if (!badPaths.has(path)) {
        badPaths.set(path, [])
      }

      const messages: string[] = []

      // --- Handle specific high-priority codes BEFORE union/switch ---
      if (zodIssue.code === 'unrecognized_keys') {
        const maxKeysToShow = 3
        const { keys } = zodIssue
        const truncatedKeys = keys.slice(0, maxKeysToShow)
        const ellipsis = keys.length > maxKeysToShow ? '...' : ''
        let message = `has unrecognized keys: ${truncatedKeys.map((k) => `\`${k}\``).join(', ')}${ellipsis}`
        // Add hint for root-level unrecognized keys, likely from union .strict() failures
        if (zodIssue.path.length === 0) {
          message +=
            ' (Hint: No union variant matched. Check for extra keys or type mismatches in variants.)'
        }
        messages.push(message)
      }
      // --- End high-priority handling ---

      // Handle union type validation errors (only if not handled above)
      else if ('unionErrors' in zodIssue && zodIssue.unionErrors) {
        // --- Moved initialization out of the loop ---
        const collectedLiterals: Record<string, (string | number | boolean)[]> = {}
        const collectedMessages: Record<string, string[]> = {}

        // Process nested issues within the union
        for (const unionError of zodIssue.unionErrors) {
          for (const issue of unionError.issues) {
            // console.log('---- Zod Union Issue ----\\n', JSON.stringify(issue, null, 2))
            const nestedPath = issue.path.join('.')

            // Ensure paths exist in collection maps
            if (!collectedLiterals[nestedPath]) collectedLiterals[nestedPath] = []
            if (!collectedMessages[nestedPath]) collectedMessages[nestedPath] = []

            if (issue.code === 'invalid_literal') {
              const { expected } = issue
              if (
                expected !== undefined &&
                expected !== null &&
                (typeof expected === 'string' ||
                  typeof expected === 'number' ||
                  typeof expected === 'boolean')
              ) {
                collectedLiterals[nestedPath].push(expected)
              }
              // Still add the raw message for fallback
              collectedMessages[nestedPath].push(issue.message)
            }
            // Keep existing enum handling if needed, but literal should cover most cases
            else if (issue.code === 'invalid_enum_value') {
              const { options } = issue
              if (options && options.length > 0) {
                collectedLiterals[nestedPath].push(...options.map(String)) // Assuming options are compatible
              }
              collectedMessages[nestedPath].push(issue.message)
            }
            // Keep existing unrecognized keys handling
            else if (issue.code === 'unrecognized_keys') {
              const maxKeysToShow = 3
              const { keys } = issue
              const truncatedKeys = keys.slice(0, maxKeysToShow)
              const ellipsis = keys.length > maxKeysToShow ? '...' : ''
              collectedMessages[nestedPath].push(
                `has unrecognized keys: ${truncatedKeys.map((k) => `\`${k}\``).join(', ')}${ellipsis}`,
              )
            }
            // <-- Add handling for invalid_type here -->
            else if (issue.code === 'invalid_type') {
              const received = issue.received === 'undefined' ? 'missing' : issue.received
              const actualValue = getByPath(parentObj, nestedPath)
              const actualValueStr =
                typeof actualValue === 'object' && actualValue !== null
                  ? JSON.stringify(actualValue)
                  : String(actualValue)

              let expectedOutput = String(issue.expected)
              const MAX_EXPECTED_TO_SHOW = 3
              if (typeof issue.expected === 'string' && issue.expected.includes(' | ')) {
                const expectedValues = issue.expected.split(' | ')
                if (expectedValues.length > MAX_EXPECTED_TO_SHOW) {
                  const shownValues = expectedValues.slice(0, MAX_EXPECTED_TO_SHOW).join(' | ')
                  const remainingCount = expectedValues.length - MAX_EXPECTED_TO_SHOW
                  expectedOutput = `${shownValues} | .. or ${remainingCount} others ..`
                }
              }

              collectedMessages[nestedPath].push(
                `got invalid type: ${received} (value: \`${actualValueStr}\`, expected: ${expectedOutput})`,
              )
            }
            // <-- End added handling -->
            else {
              collectedMessages[nestedPath].push(issue.message) // Handle other nested codes
            }
          }
        }

        // --- Moved processing logic here ---
        // Now, add messages to badPaths based on collected info AFTER processing ALL union errors
        for (const nestedPath in collectedMessages) {
          if (!badPaths.has(nestedPath)) {
            badPaths.set(nestedPath, [])
          }
          const targetMessages = badPaths.get(nestedPath)!

          // Prioritize more specific messages (like invalid type with details)
          const invalidTypeMessages = collectedMessages[nestedPath].filter((m) =>
            m.startsWith('got invalid type:'),
          )
          const unrecognizedKeyMessages = collectedMessages[nestedPath].filter((m) =>
            m.startsWith('has unrecognized keys:'),
          )
          const literalMessages = collectedLiterals[nestedPath] ?? []

          if (invalidTypeMessages.length > 0) {
            targetMessages.push(...invalidTypeMessages)
          } else if (unrecognizedKeyMessages.length > 0) {
            targetMessages.push(...unrecognizedKeyMessages)
          } else if (literalMessages.length > 0) {
            const uniqueLiterals = [...new Set(literalMessages)]
            targetMessages.push(`should be one of: \`${uniqueLiterals.join('`, `')}\``)
          } else {
            // Fallback to joining the collected raw messages for this path
            targetMessages.push(...collectedMessages[nestedPath])
          }
        }

        // Prevent the main `messages` array from being populated further for this union issue
        continue // Skip adding messages directly from the top-level union issue itself
      }
      // Handle other specific error codes (only if not handled above)
      else {
        // Handle specific error codes for better messages
        let received: string
        let type: string
        let bigType: string

        switch (zodIssue.code) {
          case 'invalid_type': {
            received = zodIssue.received === 'undefined' ? 'missing' : zodIssue.received
            const actualValue = getByPath(obj, path) as any
            const actualValueStr =
              typeof actualValue === 'object' && actualValue !== null
                ? JSON.stringify(actualValue)
                : String(actualValue) // Use String() for null/primitives

            // Simple message not relying on zodIssue.expected
            messages.push(`got invalid type: ${received} (value: \`${actualValueStr}\`)`)
            break
          }
          case 'invalid_string':
            if (zodIssue.validation === 'email') {
              messages.push('should be a valid email address')
            } else if (zodIssue.validation === 'url') {
              messages.push('should be a valid URL')
            } else {
              messages.push(zodIssue.message)
            }
            break
          case 'too_small':
            type = zodIssue.type === 'string' ? 'characters' : 'items'
            messages.push(`should have at least ${zodIssue.minimum} ${type}`)
            break
          case 'too_big':
            bigType = zodIssue.type === 'string' ? 'characters' : 'items'
            messages.push(`should have at most ${zodIssue.maximum} ${bigType}`)
            break
          case 'custom':
            messages.push(zodIssue.message)
            break
          default:
            messages.push(zodIssue.message)
        }
      }

      // Ensure messages collected directly in the `messages` array (e.g., from the switch)
      // are added to the correct path in badPaths.
      if (messages.length > 0) {
        badPaths.get(path)?.push(...messages)
      }

      const field = path || 'Input'
      // Ensure humanReadable for the individual ZodIssueWithContext is still generated correctly
      // even if messages array is empty because handled via badPaths/nested issues.
      const issueSpecificMessages = badPaths.get(path) ?? messages
      const humanReadable = `Path \`${field}\` ${issueSpecificMessages.join(', ')}`

      zodIssuesWithContext.push({
        ...zodIssue,
        parentObj,
        humanReadable,
      })
    }

    // Improved formatting for the top-level humanReadable string
    const errorList = Array.from(badPaths.entries())
      .map(([path, messages]) => {
        const field = path || 'Input'
        return ` - \`${field}\`: ${messages.join(', ')}` // Format as list item
      })
      .join('\n')

    const humanReadable = `Validation failed for the following fields:\n${errorList}` // Add header

    return { success: false, errors: zodIssuesWithContext, humanReadable }
  }

  return { success: true, safe: zodRes.data, errors: [], humanReadable: '' }
}
