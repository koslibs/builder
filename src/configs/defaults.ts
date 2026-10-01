import type { EnvironmentConfig } from '@rsbuild/core';

export const DEFAULT_PORT = 8080;
export const BROWSERSLIST = ['last 2 versions'];

export function createClientDefaults(): EnvironmentConfig {
    return {
        output: {
            target: 'web',
            overrideBrowserslist: BROWSERSLIST,
            cssModules: { auto: true },
            distPath: { root: 'dist' },
            assetPrefix: './',
        },
        performance: { chunkSplit: { strategy: 'split-by-experience' } },
    };
}
