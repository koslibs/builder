import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { mergeRsbuildConfig, type RsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

import type { KoslibsBuilderConfig } from '../typings/config.js';

import { createClientDefaults, DEFAULT_PORT } from './defaults.js';

function defaultEntry(root: string, names: string[]): string {
    return resolve(
        root,
        names.find((name) => existsSync(resolve(root, name))) ?? names[0]
    ).replaceAll('\\', '/');
}

export function createUiConfig(config: KoslibsBuilderConfig, root: string): RsbuildConfig {
    const entry = config.clientConfig?.source?.entry ?? config.rsbuildConfig?.source?.entry;
    const merged = mergeRsbuildConfig(
        {
            ...createClientDefaults(),
            source: {
                entry: entry ?? {
                    index: defaultEntry(root, ['src/index.tsx', 'src/main.tsx', 'src/index.ts']),
                },
                tsconfigPath: resolve(root, 'tsconfig.json'),
            },
            server: { port: DEFAULT_PORT, strictPort: true },
            plugins: [pluginReact()],
        },
        config.rsbuildConfig,
        { environments: { client: config.clientConfig ?? {} } }
    );
    return mergeRsbuildConfig(merged, {
        server: { port: config.port ?? config.rsbuildConfig?.server?.port ?? DEFAULT_PORT },
    });
}
