import type { z } from 'zod'

type ZodIssueWithContext = z.ZodIssue & { parentObj: unknown }

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

export function zodParseWithContext<T extends z.ZodType>(
  schema: T,
  obj: unknown,
): { success: boolean; safe?: z.infer<T>; errors: ZodIssueWithContext[] } {
  const zodRes = schema.safeParse(obj)
  if (!zodRes.success) {
    const reportErrors: ZodIssueWithContext[] = []
    for (const error of zodRes.error.errors) {
      const lastPath = error.path
      let parentObj: unknown = {}
      if (lastPath) {
        const strPath = lastPath.slice(0, -1).join('.')
        parentObj = getByPath(obj, strPath) ?? {}
      }

      reportErrors.push({
        ...error,
        parentObj,
      })
    }
    return { success: false, errors: reportErrors }
  }

  return { success: true, safe: zodRes.data, errors: [] }
}
