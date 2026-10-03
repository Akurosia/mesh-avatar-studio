import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { dismissGuide, samplePresent, sampleSkipReason } from './sample';

test('paths and tooltips use ~ while copies keep full paths, and recipient changes persist', async ({ page, context }) => {
  test.skip(!samplePresent, sampleSkipReason); await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/'); await dismissGuide(page);
  await page.locator('.open-menu > summary').click(); await page.getByTestId('project-sample-miko-qipao').click();
  await page.getByTestId('variants-panel').getByRole('checkbox', { name: 'Mouth', exact: true }).check();
  const card = page.getByTestId('ask-agent-variants');
  await expect(card.locator('.root-path')).toHaveText(resolve('.').replace(homedir(), '~'));
  await expect(card.locator('.root-path')).toHaveAttribute('title', resolve('.').replace(homedir(), '~'));
  await expect(page.getByTestId('project-location')).toContainText('~/');
  await card.getByRole('button', { name: 'Copy full path', exact: true }).click(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(resolve('.'));
  const leaked = await page.locator('main').evaluate((main, home) => {
    const text = (main as HTMLElement).innerText, attributes = [...main.querySelectorAll('*')].flatMap(element => [...element.attributes].map(attr => attr.value));
    return [text, ...attributes].filter(value => value.includes(home));
  }, homedir()); expect(leaked).toEqual([]);
  await card.getByRole('button', { name: 'Copy message', exact: true }).click();
  const codex = await page.evaluate(() => navigator.clipboard.readText());
  for (const word of ['imagegen', 'source.png', 'variants/', 'build-sprites', 'render-poses', 'already consented', 'Do not use other external services']) expect(codex).toContain(word);
  await expect(card.getByText('Images will be sent to Codex image generation.', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Claude Code', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Claude Code', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.agent-disclosure')).toHaveCount(0);
  await expect(card.getByRole('textbox')).toContainText('then stop'); await expect(card.getByRole('textbox')).toContainText('Do not generate or send images');
  await page.reload(); await expect(page.getByTestId('preview-status')).toHaveAttribute('data-state', 'ready');
  await page.getByTestId('variants-panel').getByRole('checkbox', { name: 'Mouth', exact: true }).check();
  await expect(card.getByRole('button', { name: 'Claude Code', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(card.getByRole('textbox')).toContainText('そこで止まってください'); await expect(card.locator('.agent-instruction')).toContainText('Claude Code');
  await card.getByRole('button', { name: 'Codex', exact: true }).click();
  await expect(card.getByText('画像は Codex の画像生成に送られます', { exact: true })).toBeVisible();
  await expect(card.getByRole('textbox')).toContainText('ユーザーは Codex の画像生成の利用に同意済み');
});
test('blocked preference storage still allows recipient and wheel mode changes', async ({ page }) => {
  test.skip(!samplePresent, sampleSkipReason);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await dismissGuide(page);
  await page.getByTestId('variants-panel').getByRole('checkbox', { name: 'Mouth', exact: true }).check();
  await page.getByTestId('ask-agent-variants').getByRole('button', { name: 'Claude Code', exact: true }).click();
  await expect(page.getByTestId('ask-agent-variants').getByRole('textbox')).toContainText('Claude Code cannot generate images');
  await page.getByRole('combobox', { name: 'Mouse wheel', exact: true }).selectOption('pan');
  await expect(page.getByRole('combobox', { name: 'Mouse wheel', exact: true })).toHaveValue('pan'); expect(errors).toEqual([]);
});
