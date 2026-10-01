import { expect, test } from '@koslibs/builder/playwright';

test('application appearance @screenshots', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('application.png');
});
