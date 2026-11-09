const signatureAlgorithmValues = ['sha1', 'sha256', 'sha384'] as const

/** Signature algorithms supported for Transloadit API signing. */
export type SignatureAlgorithm = (typeof signatureAlgorithmValues)[number]

/** Checks whether a normalized algorithm is supported for Transloadit API signatures. */
export const isSignatureAlgorithm = (value: string): value is SignatureAlgorithm =>
  signatureAlgorithmValues.some((algorithm) => algorithm === value)
