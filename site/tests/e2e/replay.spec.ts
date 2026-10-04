import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
});

test('the captured meeting replays one intervention at a time, then completes', async ({ page }) => {
  const terminal = page.locator('[data-replay]');
  const blocks = terminal.locator('[data-block]');
  await expect(blocks).toHaveCount(6);
  await page.getByRole('button', { name: 'Replay the meeting' }).click();

  await expect(blocks.filter({ visible: true })).toHaveCount(2);
  await expect(terminal.getByRole('status')).toHaveText('Intervention 1 of 5');

  await page.clock.runFor(1200);
  await expect(blocks.filter({ visible: true })).toHaveCount(3);
  await expect(terminal.getByRole('status')).toHaveText('Intervention 2 of 5');

  await page.clock.runFor(10_000);
  await expect(blocks.filter({ visible: true })).toHaveCount(6);
  await expect(terminal.getByRole('status')).toHaveText('Intervention 5 of 5 — recording complete');
  await expect(terminal).toContainText('Human decision: pending.');
});

test('the replay can be skipped to the complete capture', async ({ page }) => {
  await page.getByRole('button', { name: 'Replay the meeting' }).click();
  await page.getByRole('button', { name: 'Show the whole capture' }).click();
  await expect(page.locator('[data-replay] [data-block]').filter({ visible: true })).toHaveCount(6);
});

test('the full capture is readable before any replay', async ({ page }) => {
  await expect(page.locator('[data-replay] [data-block]').filter({ visible: true })).toHaveCount(6);
});
