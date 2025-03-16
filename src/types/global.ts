export {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  type $TSFixMe = any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  type $TSFixMeFunction = (...args: $TSFixMe[]) => any
}
