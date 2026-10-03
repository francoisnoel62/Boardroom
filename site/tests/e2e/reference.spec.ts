import { expect, test } from '@playwright/test';

test('the CLI reference lists every command from the help text', async ({ page }) => {
  await page.goto('/docs/reference/cli/');
  await expect(page.locator('[data-command]')).toHaveCount(13);
  await expect(page.locator('[data-command="demo"]')).toContainText('boardroom demo [--next]');
});

test('a command the CLI accepts without a handler is flagged instead of documented as working', async ({ page }) => {
  await page.goto('/docs/reference/cli/');
  await expect(page.locator('[data-command="status"] [data-caveat]')).toContainText('prints the help text');
});

test('exit codes match the codes set in the source', async ({ page }) => {
  await page.goto('/docs/reference/exit-codes/');
  const codes = await page.locator('[data-exit-code]').evaluateAll(rows => rows.map(row => row.getAttribute('data-exit-code')));
  expect(codes).toEqual(['0', '1', '2', '130']);
});

test('JSON output fields come from the application schemas', async ({ page }) => {
  await page.goto('/docs/reference/json-output/');
  const decision = page.locator('[data-schema="decision"]');
  await expect(decision).toContainText('views[].stance');
  await expect(decision).toContainText('"APPROVED" | "REJECTED" | "INSUFFICIENT_EVIDENCE"');
  const history = page.locator('[data-schema="history"]');
  await expect(history).toContainText('operations[].receipts[].sha256');
  await expect(history).toContainText('events[type="recorded.message"].position');
});

test('the platform matrix comes from the CI matrix', async ({ page }) => {
  await page.goto('/docs/reference/platforms/');
  await expect(page.locator('[data-platform]')).toHaveText([/Windows x64/, /Linux x64/, /macOS arm64/]);
});
