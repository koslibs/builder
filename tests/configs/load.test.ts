import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, test } from '@rstest/core';

import { loadBuilderConfig } from '../../src/configs/load.js';
import { normalizeConfig } from '../../src/configs/normalize.js';

describe('project configuration contract', () => {
    test('uses defaults when there is no project config', async () => {
        await mkdir('.cache/tests', { recursive: true });
        const root = await mkdtemp(resolve('.cache/tests/project-'));
        expect(await loadBuilderConfig(root)).toEqual({});
    });

    test('loads TypeScript types and relative imports from a path with spaces and #', async () => {
        await mkdir('.cache/tests', { recursive: true });
        const root = await mkdtemp(resolve('.cache/tests/project with spaces # config-'));
        await writeFile(
            resolve(root, 'port.ts'),
            'export type Port = number; export const port: Port = 9012;'
        );
        await writeFile(
            resolve(root, 'koslibs-builder.ts'),
            "import { port, type Port } from './port.ts'; " +
                'const config: { port: Port; typo: boolean } = { port, typo: true }; ' +
                'export default config;'
        );
        const config = await loadBuilderConfig(root);
        expect(config.port).toBe(9012);
        expect(config).not.toHaveProperty('typo');
    });

    test('reports invalid supported fields instead of silently changing behavior', () => {
        for (const port of [0, 65536, 8080.5, '8080']) {
            expect(() => normalizeConfig({ port })).toThrow('port must be');
        }
        expect(() => normalizeConfig(null)).toThrow('default-export');
        expect(() => normalizeConfig({ clientConfig: [] })).toThrow('clientConfig must be');
        expect(() => normalizeConfig({ storybookViteConfig: [] })).toThrow(
            'storybookViteConfig must be'
        );
    });
});
