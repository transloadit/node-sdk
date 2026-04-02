export async function ensureUniqueCounterValue<T>({
  initialValue,
  isTaken,
  reserve,
  nextValue,
}: {
  initialValue: T
  isTaken: (candidate: T) => Promise<boolean> | boolean
  reserve: (candidate: T) => void
  nextValue: (counter: number) => T
}): Promise<T> {
  let candidate = initialValue
  let counter = 1

  while (await isTaken(candidate)) {
    candidate = nextValue(counter)
    counter += 1
  }

  reserve(candidate)
  return candidate
}
