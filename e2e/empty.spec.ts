import { expect, test } from '@playwright/test';

test('missing sample images show an empty workspace with project opening controls', async ({ page }) => {
  await page.route('**/miko-qipao/**', route => {
    if (new URL(route.request().url()).pathname.endsWith('.png')) return route.fulfill({ status: 404, body: '' });
    return route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Open a project', exact: true })).toBeVisible();
  await expect(page.getByText('Open rig.json and an image folder to begin. Sample images are installed separately.')).toBeVisible();
  await page.locator('.open-menu > summary').click();
  await expect(page.getByRole('button', { name: 'Open rig.json…', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Open image folder…', exact: true })).toBeEnabled();
  await expect(page.getByTestId('preview')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/empty-workspace.png' });
});
