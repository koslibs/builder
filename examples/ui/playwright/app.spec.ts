import { expect, test } from '@koslibs/builder/playwright';

test('loads the app and a dynamic chunk', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading')).toHaveText('Hello, GullEye');
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('heading')).toHaveText('Hello, GullEye — details loaded');
});
