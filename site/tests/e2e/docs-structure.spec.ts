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
  const links = await page.locator('a[href^="/docs/"]').evaluateAll(anchors =>
    [...new Set(anchors.map(anchor => anchor.getAttribute('href')!.split('#')[0]!))]);
  expect(links.length).toBeGreaterThan(20);
  for (const link of links) {
    await page.goto(link);
    await expect(page.locator('.page-status [data-status]'), link).toBeVisible();
  }
});

test('planned features are labelled with the plan that delivers them', async ({ page }) => {
  await page.goto('/docs/first-real-meeting/');
  await expect(page.locator('.page-status [data-status]')).toHaveText('Planned · Plan 02');
});

test('an llms.txt index is published for AI assistants', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain('/docs/quickstart');
});
