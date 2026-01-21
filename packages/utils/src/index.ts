export type SignatureAlgorithm = 'sha1' | 'sha256' | 'sha384'

const algorithmMap = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
} as const

const isSignatureAlgorithm = (value: string): value is SignatureAlgorithm =>
  value === 'sha1' || value === 'sha256' || value === 'sha384'

const getSubtle = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto is required to sign Transloadit payloads')
  }
  return subtle
}

const hmacHex = async (
  algorithm: SignatureAlgorithm,
  key: string,
  data: string,
): Promise<string> => {
  const subtle = getSubtle()
  const encoder = new TextEncoder()
  const cryptoKey = await subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: { name: algorithmMap[algorithm] } },
    false,
    ['sign'],
  )
  const signature = await subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  const bytes = new Uint8Array(signature)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export const signParams = async (
  paramsString: string,
  authSecret: string,
  algorithm: SignatureAlgorithm = 'sha384',
): Promise<string> => {
  const normalized = algorithm.toLowerCase()
  if (!isSignatureAlgorithm(normalized)) {
    throw new Error(`Unsupported signature algorithm: ${algorithm}`)
  }
  const signature = await hmacHex(normalized, authSecret, paramsString)
  return `${normalized}:${signature}`
}

export type VerifyWebhookSignatureOptions = {
  rawBody: string
  signatureHeader?: string
  authSecret: string
}

export const verifyWebhookSignature = async (
  options: VerifyWebhookSignatureOptions,
): Promise<boolean> => {
  if (!options.signatureHeader) return false

  const signatureHeader = options.signatureHeader.trim()
  if (!signatureHeader) return false

  const separatorIndex = signatureHeader.indexOf(':')
  const prefix = separatorIndex === -1 ? 'sha1' : signatureHeader.slice(0, separatorIndex)
  const signature =
    separatorIndex === -1 ? signatureHeader : signatureHeader.slice(separatorIndex + 1)

  const normalized = prefix.toLowerCase()
  if (!isSignatureAlgorithm(normalized)) {
    return false
  }

  const expected = await hmacHex(normalized, options.authSecret, options.rawBody)
  return safeCompare(expected, signature)
}
