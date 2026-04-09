export function parseOptionalEnumValue<TValue extends string>({
  flagName,
  supportedValues,
  value,
}: {
  flagName: string
  supportedValues: readonly TValue[]
  value: unknown
}): TValue | null {
  if (value == null || value === '') {
    return null
  }

  if (typeof value === 'string' && supportedValues.includes(value as TValue)) {
    return value as TValue
  }

  throw new Error(
    `Unsupported ${flagName} value "${String(value)}". Supported values: ${supportedValues.join(', ')}`,
  )
}

export function parseUniqueEnumArray<TValue extends string>({
  flagName,
  supportedValues,
  values,
}: {
  flagName: string
  supportedValues: readonly TValue[]
  values: readonly string[]
}): TValue[] {
  if (values.length === 0) {
    return []
  }

  const parsedValues: TValue[] = []
  const seen = new Set<TValue>()

  for (const value of values) {
    if (!supportedValues.includes(value as TValue)) {
      throw new Error(
        `Unsupported ${flagName} value "${value}". Supported values: ${supportedValues.join(', ')}`,
      )
    }

    const parsedValue = value as TValue
    if (seen.has(parsedValue)) {
      continue
    }

    seen.add(parsedValue)
    parsedValues.push(parsedValue)
  }

  return parsedValues
}
