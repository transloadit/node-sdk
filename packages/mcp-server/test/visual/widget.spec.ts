import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { widgetStateFixtures } from './fixtures.ts'
import {
  fitFrameToContent,
  hostKinds,
  mountWidget,
  routeHostAndMedia,
  settleWidget,
  themes,
  widths,
} from './host.ts'

// Set to also write every state as a flat PNG for reviewers, e.g. /tmp/widget-states.
const statesDir = process.env.WIDGET_STATES_DIR

for (const fixture of widgetStateFixtures) {
  for (const host of hostKinds) {
    if (host === 'openai' && !fixture.openai) continue
    for (const width of widths) {
      for (const theme of themes) {
        const name = `${fixture.name}_${width}_${theme}_${host}`
        test(name, async ({ page }) => {
          await routeHostAndMedia(page)
          const { card, frame } = await mountWidget(page, { fixture, host, theme, width })
          await settleWidget(page, frame)
          await fitFrameToContent(page)

          await expect(card).toHaveScreenshot(`${name}.png`)
          if (statesDir) await card.screenshot({ path: join(statesDir, `${name}.png`) })
        })
      }
    }
  }
}
