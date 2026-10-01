import { describe, expect, test } from '@rstest/core';

import { createLibraryConfig } from '../../src/configs/library.js';
import { createUiConfig } from '../../src/configs/ui.js';

describe('project configuration contract', () => {
    test('extends UI defaults while preserving mandatory type checks', () => {
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
        expect(
            config.plugins?.some(
                (plugin) => plugin && 'name' in plugin && plugin.name === 'rsbuild:type-check'
            )
        ).toBe(true);
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
});
