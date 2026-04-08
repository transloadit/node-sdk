const uniqueCounterScopes = new WeakMap<object, Promise<void>>()

async function runEnsureUniqueCounterValue<T>({
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

export async function ensureUniqueCounterValue<T>({
  initialValue,
  isTaken,
  reserve,
  nextValue,
  scope,
}: {
  initialValue: T
  isTaken: (candidate: T) => Promise<boolean> | boolean
  reserve: (candidate: T) => void
  nextValue: (counter: number) => T
  scope?: object
}): Promise<T> {
  if (scope == null) {
    return await runEnsureUniqueCounterValue({
      initialValue,
      isTaken,
      reserve,
      nextValue,
    })
  }

  const previous = uniqueCounterScopes.get(scope) ?? Promise.resolve()
  let releaseScope: (() => void) | undefined
  const pendingScope = new Promise<void>((resolve) => {
    releaseScope = resolve
  })
  const currentScope = previous
    .catch(() => undefined)
    .then(async () => {
      await pendingScope
    })
  uniqueCounterScopes.set(scope, currentScope)

  await previous.catch(() => undefined)

  try {
    return await runEnsureUniqueCounterValue({
      initialValue,
      isTaken,
      reserve,
      nextValue,
    })
  } finally {
    releaseScope?.()
    if (uniqueCounterScopes.get(scope) === currentScope) {
      uniqueCounterScopes.delete(scope)
    }
  }
}
