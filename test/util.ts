import { RequestError, type Transloadit } from '../src/Transloadit.ts'

export const createProxy = (transloaditInstance: Transloadit) => {
  return new Proxy(transloaditInstance, {
    get(target, propKey) {
      // @ts-expect-error I dunno how to type
      const origMethod = target[propKey]
      if (typeof origMethod === 'function') {
        return (...args: unknown[]) => {
          const result = origMethod.apply(target, args)

          if (!(result && 'then' in result)) {
            return result
          }

          const newPromise = (result as Promise<unknown>).catch((err: unknown) => {
            if (err instanceof Error && 'cause' in err && err.cause instanceof RequestError) {
              if (err.cause.request != null) {
                // for util.inspect:
                Object.defineProperty(err.cause, 'request', {
                  value: err.cause.request,
                  enumerable: false,
                })
                // for vitest "Serialized Error"
                Object.defineProperty(err.cause.request, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
              }
              if (err.cause.response != null) {
                Object.defineProperty(err.cause, 'response', {
                  value: err.cause.response,
                  enumerable: false,
                })
                Object.defineProperty(err.cause.response, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
              }
              if (err.cause.options != null) {
                Object.defineProperty(err.cause, 'options', {
                  value: err.cause.options,
                  enumerable: false,
                })
                Object.defineProperty(err.cause.options, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
              }
              if (err.cause.timings != null) {
                Object.defineProperty(err.cause, 'timings', {
                  value: err.cause.timings,
                  enumerable: false,
                })
                Object.defineProperty(err.cause.timings, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
              }
            }
            throw err
          })

          // pass on the assembly id if present
          if (result?.assemblyId != null) {
            Object.assign(newPromise, { assemblyId: result.assemblyId })
          }
          return newPromise
        }
      }

      return origMethod
    },
  })
}
