import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/design/', '/docs/', '/docs/quickstart/', '/docs/your-data/'];

for (const theme of ['dark', 'light'] as const) {
  for (const path of pages) {
    test(`${path} has no serious accessibility violation in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem('starlight-theme', value), theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical');
      expect(blocking.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}

test('motion is removed when the visitor asks for reduced motion', async ({ page }) => {
  const duration = () => page.locator('[data-step]').first().evaluate(element => getComputedStyle(element).transitionDuration);
  await page.goto('/');
  expect(await duration()).not.toBe('0s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duration()).toBe('0s');
});
