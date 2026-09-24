/** Format canonical English source copy without depending on the host's ICU locale data. */
export function formatEnglishList(
  values: readonly string[],
  conjunction: 'and' | 'or' = 'and',
): string {
  const lastValue = values.at(-1)
  if (lastValue === undefined) throw new Error('English lists must contain at least one value')
  if (values.length === 1) return lastValue
  if (values.length === 2) return `${values[0]} ${conjunction} ${lastValue}`
  return `${values.slice(0, -1).join(', ')}, ${conjunction} ${lastValue}`
}
