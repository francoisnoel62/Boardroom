import { expect, test } from '@playwright/test';

// Phase 5 pages, against the real build: no release is published yet.
test('the roadmap lists the nine plans with their real status and source', async ({ page }) => {
  await page.goto('/roadmap/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roadmap');
  const plans = page.locator('[data-plan]');
  await expect(plans).toHaveCount(9);
  await expect(plans.first().locator('[data-status]')).toHaveText('Accepted with reservations');
  await expect(plans.nth(1).locator('[data-status]')).toHaveText('Next');
  await expect(plans.first().getByRole('link', { name: 'Acceptance record' })).toHaveAttribute('href', /docs\/plan-01-acceptance\.md$/);
  await expect(plans.nth(8).getByRole('link', { name: /Plan file/ })).toHaveAttribute('href', /boardroom-plans\/09-BETA-PUBLIQUE\.md$/);
  await expect(page.getByText('The first public download is planned with the public beta')).toBeVisible();
});

test('the header leads to the roadmap page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'section links are hidden on narrow screens; the footer carries them');
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Roadmap' }).click();
  await expect(page).toHaveURL(/\/roadmap\/$/);
});

test('the changelog is honest about releases and lists reached milestones', async ({ page }) => {
  await page.goto('/changelog/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Changelog');
  await expect(page.locator('[data-releases]')).toHaveAttribute('data-releases', 'none');
  await expect(page.locator('[data-releases]').getByText('No release has been published yet.')).toBeVisible();
  const milestone = page.locator('[data-milestone="01"]');
  await expect(milestone).toContainText('Installable local journey');
  await expect(milestone.locator('time')).toHaveAttribute('datetime', '2026-10-03');
  await expect(milestone).toContainText('Accepted with reservations');
});

test('the brand kit offers the mark, the palette and the press descriptions', async ({ page, request }) => {
  await page.goto('/brand/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brand and press kit');
  const downloads = page.locator('a[download][href^="/brand/"]');
  await expect(downloads).toHaveCount(4);
  for (const href of await downloads.evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
    const response = await request.get(href);
    expect(response.headers()['content-type'], href).toContain('image/svg+xml');
  }
  await expect(page.locator('[data-swatch]')).toHaveCount(10);
  await expect(page.locator('[data-swatch="accent"]')).toContainText('#d8eeae');
  await expect(page.locator('[data-description="short"]')).toContainText('recorded example');
  await expect(page.getByRole('img', { name: /Boardroom recorded example in a real terminal/ })).toBeVisible();
});

test('the privacy page states what the site stores and that nothing tracks visitors', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await expect(page.getByText('This site sets no cookies')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Hosting' })).toContainText('Vercel');
  await expect(page.getByRole('region', { name: 'Hosting' })).toContainText('No Vercel Web Analytics or Speed Insights');
  for (const key of ['starlight-theme', 'starlight-synced-tabs__os', 'sl-sidebar-state']) {
    await expect(page.locator('[data-storage-key]', { hasText: key })).toBeVisible();
  }
});

test('the security page explains how to report a vulnerability and the current limits', async ({ page }) => {
  await page.goto('/security/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Security');
  await expect(page.getByRole('link', { name: 'Report a vulnerability privately' }))
    .toHaveAttribute('href', 'https://github.com/francoisnoel62/Boardroom/security/advisories/new');
  await expect(page.getByText('No candidate demonstrates protection')).toBeVisible();
});

test('the footer links to every project page', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('navigation', { name: 'Footer' });
  for (const [name, href] of [['Roadmap', '/roadmap/'], ['Changelog', '/changelog/'], ['Field notes', '/field-notes/'], ['Brand', '/brand/'], ['Privacy', '/privacy/'], ['Security', '/security/']] as const) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
});
