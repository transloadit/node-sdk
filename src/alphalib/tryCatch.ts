/**
 * Represents a successful result where error is null and data is present
 */
export type Success<T> = [null, T]

/**
 * Represents a failure result where error contains an error instance and data is null
 */
export type Failure<E = Error> = [E, null]

/**
 * Represents the result of an operation that can either succeed with T or fail with E
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * Wraps a promise in a try-catch block and returns a tuple of [error, data]
 * where exactly one value is non-null
 *
 * @param promise The promise to execute safely
 * @returns A tuple of [error, data] where one is null
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const data = await promise
    return [null, data] as Success<T>
  } catch (error) {
    return [error as E, null] as Failure<E>
  }
}
