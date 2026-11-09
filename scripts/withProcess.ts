import type { ResultPromise } from 'execa'

/** Runs work while a subprocess lives, then terminates and awaits that process on every exit path. */
export async function withProcess<Value>(
  child: ResultPromise,
  run: () => Promise<Value>,
): Promise<Value> {
  try {
    return await run()
  } finally {
    child.kill('SIGTERM')
    // A successful cleanup often makes Execa reject; preserve the error from the guarded work.
    await child.catch(() => undefined)
  }
}
