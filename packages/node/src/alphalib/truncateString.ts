/** Lazily truncates Unicode code points and marks a truncated value with an ellipsis. */
export function truncateCodePointsWithEllipsis(
  codePoints: Iterable<string>,
  maxCharacters: number,
): string {
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 0) {
    throw new Error('String truncation requires a nonnegative safe character limit')
  }

  const characters: string[] = []
  for (const character of codePoints) {
    if (characters.length === maxCharacters) {
      return `${characters.join('')}…`
    }
    characters.push(character)
  }
  return characters.join('')
}

/** Truncates a string by Unicode code points and marks a truncated value with an ellipsis. */
export function truncateStringWithEllipsis(value: string, maxCharacters: number): string {
  return truncateCodePointsWithEllipsis(value, maxCharacters)
}
