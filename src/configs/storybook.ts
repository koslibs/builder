import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { mergeRsbuildConfig, type RsbuildConfig } from '@rsbuild/core';

import type { KoslibsBuilderConfig } from '../typings/config.js';
import type { StorybookConfig } from '../typings/storybook.js';
import { packageDirectory } from '../utils/packages.js';

import { createClientDefaults } from './defaults.js';
import { loadBuilderConfig } from './load.js';

export function createStorybookRsbuildConfig(config: KoslibsBuilderConfig): RsbuildConfig {
    const defaults: RsbuildConfig = createClientDefaults();
    const merged: RsbuildConfig = mergeRsbuildConfig(
        defaults,
        config.rsbuildConfig,
        config.clientConfig
    );
    // Storybook owns its entry points, HTML, dev server and output directory.
    const { environments: _environments, server: _server, html: _html, ...common } = merged;
    const { entry: _entry, ...source } = common.source ?? {};
    const { distPath: _distPath, target: _target, ...output } = common.output ?? {};
    return { ...common, source, output };
}

export async function createStorybookConfig(root = process.cwd()): Promise<StorybookConfig> {
    const config = await loadBuilderConfig(root);
    const preview = ['ts', 'tsx', 'js', 'jsx', 'mjs']
        .map((extension) => resolve(root, `.storybook/preview.${extension}`))
        .find((path) => existsSync(path));
    return {
        framework: {
            name: packageDirectory('storybook-react-rsbuild'),
            options: {},
        },
        stories: [resolve(root, 'src/**/*.stories.@(ts|tsx|js|jsx|mjs)').replaceAll('\\', '/')],
        addons: [packageDirectory('@storybook/addon-docs')],
        ...(preview ? { previewAnnotations: [preview] } : {}),
        ...(existsSync(resolve(root, 'public')) ? { staticDirs: [resolve(root, 'public')] } : {}),
        typescript: { check: true, reactDocgen: 'react-docgen-typescript' },
        async rsbuildFinal(base) {
            return mergeRsbuildConfig(base, createStorybookRsbuildConfig(config));
        },
    };
}
