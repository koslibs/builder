import { resolve } from 'node:path';

import { mergeRsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import type { RslibConfig } from '@rslib/core';

import type { KoslibsBuilderConfig } from '../typings/config.js';

import { typescriptPath } from './typescript.js';

export function createLibraryConfig(
    config: KoslibsBuilderConfig,
    root: string,
    watch = false
): RslibConfig {
    // clientConfig belongs to browser UIs and Storybook, never to the library output.
    const merged = mergeRsbuildConfig(
        {
            source: {
                entry: config.rsbuildConfig?.source?.entry ?? {
                    index: [
                        './src/**',
                        '!./src/**/*.test.*',
                        '!./src/**/*.spec.*',
                        '!./src/**/*.stories.*',
                    ],
                },
                tsconfigPath: resolve(root, '.cache/koslibs-builder/lib/tsconfig.lib.json'),
            },
            output: { target: 'web', distPath: { root: 'dist' } },
            plugins: [pluginReact()],
        },
        config.rsbuildConfig
    );
    return {
        ...merged,
        lib: [
            {
                format: 'esm',
                bundle: false,
                dts: { bundle: false, abortOnError: !watch, typescriptPath },
            },
        ],
    };
}
