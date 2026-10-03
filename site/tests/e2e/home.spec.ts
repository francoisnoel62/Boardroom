import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the first screen states the promise and how to try it', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Great decisions deserve a room.');
  const primary = page.getByRole('link', { name: 'Explore the recorded example' }).first();
  await expect(primary).toHaveAttribute('href', '/docs/quickstart/');
});

test('no download is offered while no release is published', async ({ page }) => {
  await expect(page.getByRole('link', { name: /^(download|get boardroom)/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(download|get boardroom)/i })).toHaveCount(0);
  await expect(page.locator('a[href*="/releases"]')).toHaveCount(0);
});

test('the status banner says what is available today', async ({ page }) => {
  const banner = page.getByRole('region', { name: 'Project status' });
  await expect(banner).toContainText('recorded example');
  await expect(banner).toContainText('Plan 02');
});

test('the story replays the recorded meeting in order, clearly labelled as fiction', async ({ page }) => {
  const story = page.getByRole('region', { name: 'A launch that found its focus' });
  await expect(story).toContainText('Recorded example — scripted fictional fixture');
  const steps = story.locator('[data-step]');
  await expect(steps).toHaveCount(5);
  await expect(steps.locator('[data-role]')).toHaveText([
    'Product Owner', 'Lead Developer', 'Marketing Manager', 'Product Owner', 'Marketing Manager',
  ]);
});

test('the staffing objection shows the exact cited source line', async ({ page }) => {
  const objection = page.locator('[data-step="staffing-objection"]');
  await expect(objection.locator('[data-evidence]')).toContainText('context.md · line 4');
  await expect(objection.locator('[data-evidence]')).toContainText('Team: two engineers; four weeks available for the launch.');
});

test('the revised proposal is compared with the original', async ({ page }) => {
  const comparison = page.locator('[data-proposals]');
  await expect(comparison).toContainText('Launch five integrations and self-service billing in four weeks.');
  await expect(comparison).toContainText('One integration, supervised onboarding, and five design partners.');
});

test('disagreement and the pending human decision survive to the end', async ({ page }) => {
  const views = page.locator('[data-final-views]');
  await expect(views.locator('[data-verdict]')).toHaveText(['Approved', 'Approved', 'Insufficient evidence']);
  await expect(views).toContainText('Willingness to pay remains untested.');
  await expect(page.locator('[data-human-decision]')).toHaveText('Pending');
});

test('the decision record shows the retained export and its source hash', async ({ page }) => {
  const record = page.getByRole('region', { name: 'Leave with a decision you can explain' });
  await expect(record).toContainText('# Decision memo');
  await expect(record).toContainText('88a28e448d9deacf8340dcf1b2b38a52be1c9178f158c2c40400451ec5f0b8e9');
});

test('future capabilities are labelled with the plan that delivers them', async ({ page }) => {
  const live = page.locator('#trust [data-claim="live-meetings"]');
  await expect(live.locator('[data-status]')).toHaveText('Planned · Plan 02');
});

test('the roadmap keeps the acceptance reservations visible', async ({ page }) => {
  const roadmap = page.getByRole('region', { name: 'Where Boardroom stands' });
  await expect(roadmap.locator('[data-plan="01"] [data-status]')).toHaveText('Accepted with reservations');
  await expect(roadmap.locator('[data-plan="02"] [data-status]')).toHaveText('Next');
  await expect(roadmap.locator('[data-plan="09"] [data-status]')).toHaveText('Planned');
});

test('the chosen theme is remembered and shared with the documentation', async ({ page }) => {
  const initial = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /switch to (light|dark) theme/i }).click();
  const chosen = initial === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
  await page.goto('/docs/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
});

test('the page never scrolls horizontally', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the FAQ answers cost, license and data questions honestly', async ({ page }) => {
  const faq = page.getByRole('region', { name: 'Questions worth asking' });
  await faq.getByText('Is it open source?').click();
  await expect(faq.locator('[data-claim="open-source-license"] [data-status]')).toHaveText('Planned · Plan 09');
  await faq.getByText('What leaves my machine?').click();
  await expect(faq).toContainText('no telemetry');
});

test('the engineering section shows figures derived from the repository', async ({ page }) => {
  await expect(page.locator('#engineering [data-stat="tests"] [data-value]')).toHaveText('53');
});
