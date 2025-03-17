import { RequestError, Transloadit } from '../src/Transloadit'

export const createProxy = (transloaditInstance: Transloadit) => {
  return new Proxy(transloaditInstance, {
    get(target, propKey) {
      // @ts-expect-error I dunno how to type
      const origMethod = target[propKey]
      if (typeof origMethod === 'function') {
        return function (...args: any) {
          const result = origMethod.apply(target, args)

          if (!(result && 'then' in result)) {
            return result
          }

          // @ts-expect-error any
          const newPromise = result.catch((err) => {
            if (err instanceof Error && 'cause' in err && err.cause instanceof RequestError) {
              if (err.cause.request) {
                Object.defineProperty(err.cause.request, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
                Object.defineProperty(err.cause.response, 'toJSON', {
                  value: () => undefined,
                  enumerable: false,
                })
                Object.defineProperty(err.cause.options, 'toJSON', {
                  value: () => undefined,
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
