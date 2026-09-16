/** Bound caller-selected URL identifiers equally during rendering and route dispatch. */
export function isImageSourceSelector(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim() === value
  )
}
