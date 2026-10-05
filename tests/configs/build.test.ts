import { describe, expect, test } from '@rstest/core';

import { createLibraryConfig } from '../../src/configs/library.js';
import { createStorybookViteConfig } from '../../src/configs/storybook.js';
import { createUiConfig } from '../../src/configs/ui.js';

describe('project configuration contract', () => {
    test('extends UI defaults while preserving project entry points and output', () => {
        const config = createUiConfig(
            {
                port: 9090,
                rsbuildConfig: { source: { entry: { index: './custom.tsx' } } },
                clientConfig: { output: { distPath: { root: 'frontend/dist' } } },
            },
            process.cwd()
        );
        expect(config.server?.port).toBe(9090);
        expect(config.source?.entry).toEqual({ index: './custom.tsx' });
        expect(config.environments?.client.output?.distPath).toEqual({ root: 'frontend/dist' });
    });

    test('does not let browser-specific config change library exports', () => {
        const config = createLibraryConfig(
            {
                rsbuildConfig: { output: { target: 'node' } },
                clientConfig: { source: { entry: { ignored: './storybook.tsx' } } },
            },
            process.cwd()
        );
        expect(config.output?.target).toBe('node');
        expect(config.source?.entry).not.toHaveProperty('ignored');
        expect(config.lib?.[0].format).toBe('esm');
    });

    test('keeps Storybook Vite settings separate from application and library builds', () => {
        const root = process.cwd();
        const config = {
            rsbuildConfig: { source: { define: { __APP_ONLY__: 'true' } } },
            clientConfig: { output: { distPath: { root: 'frontend/dist' } } },
            storybookViteConfig: { define: { __STORYBOOK_ONLY__: 'true' } },
        };
        const storybook = createStorybookViteConfig(config, root);
        expect(storybook.root).toBe(root);
        expect(storybook.define).toEqual({ __STORYBOOK_ONLY__: 'true' });
        expect(storybook.envPrefix).toContain('PUBLIC_');
        expect(createUiConfig(config, root).source?.define).toEqual({ __APP_ONLY__: 'true' });
        expect(createLibraryConfig(config, root).source?.define).toEqual({ __APP_ONLY__: 'true' });
    });
});
