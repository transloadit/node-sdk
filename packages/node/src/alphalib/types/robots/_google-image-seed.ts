import { z } from 'zod'

/** Google’s signed 32-bit seed ceiling, shared by provider and Robot validation. */
export const googleImageSeedMaximum = 2_147_483_647

/** Validation message for the seed range supported by Google and the cloudai CLI. */
export const googleImageSeedValidationMessage = `seed must be an integer from 0 to ${googleImageSeedMaximum}`

/** Google image seeds must fit int32 and preserve the CLI’s nonnegative seed contract. */
export const googleImageSeedSchema = z
  .number()
  .int(googleImageSeedValidationMessage)
  .min(0, googleImageSeedValidationMessage)
  .max(googleImageSeedMaximum, googleImageSeedValidationMessage)
