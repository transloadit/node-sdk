import { ApiError } from '../../src/Transloadit.ts'

const error = new ApiError({ body: { reason: 'timeout' } })
const reason: string | undefined = error.reason
const timedOut: boolean | undefined = error.reason?.includes('timeout')
const rawReason: unknown = error.rawReason

void [reason, timedOut, rawReason]
