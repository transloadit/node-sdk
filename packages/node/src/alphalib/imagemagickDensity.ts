const positiveDecimalDensityPart = String.raw`(?:0*[1-9][0-9]*(?:\.[0-9]+)?|0+\.[0-9]*[1-9][0-9]*)`

const imagemagickDensityPattern = new RegExp(
  `^${positiveDecimalDensityPart}(?:x${positiveDecimalDensityPart})?$`,
  'u',
)

function isValidImagemagickDensity(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }

  return typeof value === 'string' && imagemagickDensityPattern.test(value)
}

export { imagemagickDensityPattern, isValidImagemagickDensity }
