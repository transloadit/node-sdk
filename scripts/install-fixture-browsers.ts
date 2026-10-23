import { execa } from 'execa'

/** Use the CI image's browsers, or provision all fixture browsers for a local run. */
export async function installFixtureBrowsers(
  playwright: string,
  fixtureDir: string,
): Promise<void> {
  if (process.env.IMG_FIXTURE_BROWSERS_PREINSTALLED === '1') {
    console.log('Using preinstalled Playwright browsers and system dependencies')
    return
  }

  await execa(
    process.execPath,
    [
      playwright,
      'install',
      ...(process.env.CI && process.platform === 'linux' ? ['--with-deps'] : []),
      'chromium',
      'firefox',
      'webkit',
    ],
    { cwd: fixtureDir, stdio: 'inherit' },
  )
}
