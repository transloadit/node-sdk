const positiveDecimalDensityPart = String.raw`(?:0*[1-9]\d*(?:\.\d+)?|0+\.\d*[1-9]\d*)`

const imagemagickDensityPattern = new RegExp(
  `^${positiveDecimalDensityPart}(?:x${positiveDecimalDensityPart})?$`,
)

function isValidImagemagickDensity(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }

  return typeof value === 'string' && imagemagickDensityPattern.test(value)
}

export { imagemagickDensityPattern, isValidImagemagickDensity }
