import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve } from 'node:path';

import { chromium, expect } from '@playwright/test';

export async function verifyStorybook(directory) {
    const root = resolve(directory, 'storybook-static');
    const mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
        '.png': 'image/png',
    };
    const server = createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
            if (relative(root, file).startsWith('..')) {
                response.writeHead(403).end();
                return;
            }
            const data = await readFile(file);
            response.writeHead(200, {
                'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
            });
            response.end(data);
        } catch {
            response.writeHead(404).end();
        }
    });
    await new Promise((resolveListening) => server.listen(0, '127.0.0.1', resolveListening));
    const url = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${url}/?path=/story/example-button--default`);
        const canvas = page.frameLocator('#storybook-preview-iframe');
        await expect(canvas.getByRole('button', { name: 'GullEye', exact: true })).toBeVisible();
        await expect(
            canvas.locator('[data-build-marker="storybook-vite-setting"]')
        ).toHaveAttribute('data-public-env', 'storybook-public-value');
        assert.equal(await (await fetch(`${url}/probe.txt`)).text(), 'storybook-public-file');
        await page.getByRole('tab', { name: /Controls/ }).click();
        const control = page.locator('#control-label');
        await expect(control).toBeVisible();
        await control.fill('Changed through Controls');
        await expect(
            canvas.getByRole('button', { name: 'Changed through Controls', exact: true })
        ).toBeVisible();
        await page.goto(`${url}/iframe.html?id=example-button--docs&viewMode=docs`);
        await expect(page.locator('[data-custom-docs="builder-blocks"]')).toBeVisible();
        await expect(
            page.locator('.docblock-argstable').getByText('label', { exact: true })
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'GullEye', exact: true })).toBeVisible();
        assert.deepEqual(errors, [], 'Storybook must render without browser runtime errors');
        console.info(
            'PASS Storybook browser rendering, prop documentation and interactive Controls'
        );
    } finally {
        await browser?.close();
        server.closeAllConnections();
        await new Promise((resolveClosed) => server.close(resolveClosed));
    }
}
