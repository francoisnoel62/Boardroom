import { expect, test } from '@playwright/test';

const groups = ['Get started', 'Concepts', 'Guides', 'Reference', 'Project'];

test('the documentation is organised by purpose', async ({ page, isMobile }) => {
  await page.goto('/docs/');
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  const sidebar = page.locator('nav[aria-label="Main"]').last();
  for (const group of groups) await expect(sidebar.getByText(group, { exact: true })).toBeVisible();
});

test('every documentation page states its availability', async ({ page }) => {
  await page.goto('/docs/');
  // Rendered pages only: the Markdown copies of each page are plain text.
  const links = await page.locator('a[href^="/docs/"]:not([href$=".md"])').evaluateAll(anchors =>
    [...new Set(anchors.map(anchor => anchor.getAttribute('href')!.split('#')[0]!))]);
  expect(links.length).toBeGreaterThan(20);
  for (const link of links) {
    await page.goto(link);
    await expect(page.locator('.page-status [data-status]'), link).toBeVisible();
  }
});

test('the live workflow is a preview with an explicit outstanding acceptance gate', async ({ page }) => {
  await page.goto('/docs/first-real-meeting/');
  await expect(page.locator('.page-status [data-status]')).toHaveText('Preview');
  await expect(page.locator('main')).toContainText('Plan 02 is not accepted yet');
});

test('an llms.txt index is published for AI assistants', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain('/docs/quickstart');
});
