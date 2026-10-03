import { expect, test } from '@playwright/test';

test('the engineering page is reachable from the main navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Engineering' }).click();
  await expect(page).toHaveURL(/\/engineering\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How Boardroom is built');
});

test('figures are derived from the repository', async ({ page }) => {
  await page.goto('/engineering/');
  await expect(page.locator('[data-stat="tests"] [data-value]')).toHaveText('53');
  await expect(page.locator('[data-stat="platforms"] [data-value]')).toHaveText('3');
  await expect(page.locator('[data-stat="platforms"]')).toContainText('Windows x64, Linux x64, macOS arm64');
});

test('every engineering decision links to the evidence behind it', async ({ page }) => {
  await page.goto('/engineering/');
  const decisions = page.locator('[data-decision]');
  expect(await decisions.count()).toBeGreaterThanOrEqual(5);
  for (const decision of await decisions.all()) {
    const links = decision.getByRole('link', { name: /evidence/i });
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\/francoisnoel62\/Boardroom\/blob\/main\//);
    }
  }
});

test('what is not proven yet is stated on the page', async ({ page }) => {
  await page.goto('/engineering/');
  const limits = page.getByRole('region', { name: 'What is not proven yet' });
  expect(await limits.getByRole('listitem').count()).toBeGreaterThanOrEqual(3);
});
