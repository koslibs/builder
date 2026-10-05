import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { mergeConfig, type UserConfig } from 'vite';

import type { KoslibsBuilderConfig } from '../typings/config.js';
import type { StorybookConfig } from '../typings/storybook.js';
import { packageDirectory } from '../utils/packages.js';

import { writeGeneratedConfig } from './generated.js';
import { loadBuilderConfig } from './load.js';

export function createStorybookViteConfig(config: KoslibsBuilderConfig, root: string): UserConfig {
    return mergeConfig(
        mergeConfig({ envPrefix: ['VITE_', 'PUBLIC_'] }, config.storybookViteConfig ?? {}),
        { root }
    );
}

export async function createStorybookConfig(root = process.cwd()): Promise<StorybookConfig> {
    const config = await loadBuilderConfig(root);
    const viteConfig = await writeGeneratedConfig(root, 'storybook-vite', 'export default {};\n');
    const preview = ['ts', 'tsx', 'js', 'jsx', 'mjs']
        .map((extension) => resolve(root, `.storybook/preview.${extension}`))
        .find((path) => existsSync(path));
    return {
        framework: {
            name: packageDirectory('@storybook/react-vite'),
            options: { builder: { viteConfigPath: viteConfig.file } },
        },
        stories: [resolve(root, 'src/**/*.stories.@(ts|tsx|js|jsx|mjs)').replaceAll('\\', '/')],
        addons: [packageDirectory('@storybook/addon-docs')],
        ...(preview ? { previewAnnotations: [preview] } : {}),
        ...(existsSync(resolve(root, 'public')) ? { staticDirs: [resolve(root, 'public')] } : {}),
        typescript: { check: false, reactDocgen: 'react-docgen-typescript' },
        async viteFinal(base) {
            return mergeConfig(base, createStorybookViteConfig(config, root));
        },
    };
}
