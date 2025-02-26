import { HTTPError, Transloadit } from '../src/Transloadit'

export const createProxy = (transloaditInstance: Transloadit) => {
  return new Proxy(transloaditInstance, {
    get(target, propKey) {
      // @ts-expect-error I dunno how to type
      const origMethod = target[propKey]
      if (typeof origMethod === 'function') {
        return async function (...args: any) {
          try {
            return await origMethod.apply(target, args)
          } catch (err) {
            if (err instanceof Error && 'cause' in err && err.cause instanceof HTTPError) {
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
          }
        }
      }
      return origMethod
    },
  })
}
