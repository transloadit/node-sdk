export const lintingExamples: Array<[string, string]> = [
  ['Lint a steps file', 'transloadit assemblies lint --steps steps.json'],
  ['Lint from stdin', 'cat steps.json | transloadit assemblies lint --steps -'],
  [
    'Lint with template merge',
    'transloadit assemblies lint --template TEMPLATE_ID --steps steps.json',
  ],
  ['Auto-fix in place', 'transloadit assemblies lint --steps steps.json --fix'],
]
