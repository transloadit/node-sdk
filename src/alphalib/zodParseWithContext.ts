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

type ZodParseWithContextResult<T extends z.ZodType> = {
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

      // Handle union type validation errors
      if ('unionErrors' in zodIssue && zodIssue.unionErrors) {
        const validValues: (string | number | boolean)[] = []
        for (const unionError of zodIssue.unionErrors) {
          if (
            Array.isArray(unionError.errors) &&
            unionError.errors[0]?.code === 'invalid_literal'
          ) {
            const { expected } = unionError.errors[0]
            if (
              expected !== undefined &&
              expected !== null &&
              (typeof expected === 'string' ||
                typeof expected === 'number' ||
                typeof expected === 'boolean')
            ) {
              validValues.push(expected)
            }
          }
        }
        if (validValues.length > 0) {
          messages.push(`should be one of: \`${validValues.join('`, `')}\``)
        } else {
          for (const unionError of zodIssue.unionErrors) {
            if ('expected' in unionError && typeof unionError.expected === 'string') {
              messages.push(`should be ${unionError.expected}`)
            } else {
              messages.push(unionError.message)
            }
          }
        }
      } else if ('expected' in zodIssue && typeof zodIssue.expected === 'string') {
        messages.push(`should be ${zodIssue.expected}`)
      } else {
        // Handle specific error codes for better messages
        let received: string
        let type: string
        let bigType: string

        switch (zodIssue.code) {
          case 'invalid_type':
            received = zodIssue.received === 'undefined' ? 'missing' : zodIssue.received
            messages.push(`should be ${zodIssue.expected} but got ${received}`)
            break
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

      badPaths.get(path)?.push(...messages)

      const field = path || 'Input'
      const humanReadable = `Path \`${field}\` ${messages.join(', ')}`

      zodIssuesWithContext.push({
        ...zodIssue,
        parentObj,
        humanReadable,
      })
    }

    const humanReadable = Array.from(badPaths.entries())
      .map(([path, messages]) => {
        const field = path || 'Input'
        return `Path \`${field}\` ${messages.join(', ')}`
      })
      .join('\n')

    return { success: false, errors: zodIssuesWithContext, humanReadable }
  }

  return { success: true, safe: zodRes.data, errors: [], humanReadable: '' }
}
