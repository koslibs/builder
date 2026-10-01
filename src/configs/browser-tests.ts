import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPlaywrightConfig } from '@koslibs/configs/playwright';
import type { PlaywrightTestConfig } from '@playwright/test';

import type { BrowserTestKind, ProjectKind } from '../typings/testing.js';
import { quote } from '../utils/shell.js';

import { DEFAULT_PORT } from './defaults.js';
import { loadBuilderConfig } from './load.js';

export async function createBrowserTestConfig(
    kind: ProjectKind,
    suite: BrowserTestKind,
    root = process.cwd()
): Promise<PlaywrightTestConfig> {
    const config = await loadBuilderConfig(root);
    const port = config.port ?? config.rsbuildConfig?.server?.port ?? DEFAULT_PORT;
    const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
    const command = kind === 'ui' ? 'ui:start' : 'storybook:start';
    return createPlaywrightConfig({
        testDir: resolve(root, 'playwright'),
        testMatch:
            suite === 'screenshots'
                ? '**/*.screenshots.spec.{ts,tsx,js,mjs}'
                : '**/*.spec.{ts,tsx,js,mjs}',
        ...(suite === 'e2e' ? { testIgnore: '**/*.screenshots.spec.*' } : {}),
        outputDir: resolve(root, 'test-results', suite),
        use: { baseURL: `http://localhost:${port}`, browserName: 'chromium' },
        webServer: {
            command: `${quote(process.execPath)} ${quote(cli)} ${command} --root ${quote(root)}`,
            cwd: root,
            url: `http://localhost:${port}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
        },
    });
}
