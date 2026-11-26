/** Format canonical English integers without depending on the host's ICU locale data. */
export function formatEnglishInteger(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`API-reference English integers must be safe integers, received ${value}`)
  }

  const digits = Math.abs(value).toString()
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end))
  }

  return `${value < 0 ? '-' : ''}${groups.join(',')}`
}
