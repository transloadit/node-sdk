export interface RequiredIntentInputPolicy {
  kind: 'required'
}

export interface OptionalIntentInputPolicy {
  attachUseWhenInputsProvided: boolean
  field: string
  kind: 'optional'
}

export type IntentInputPolicy = OptionalIntentInputPolicy | RequiredIntentInputPolicy
