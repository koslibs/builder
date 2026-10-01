import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function findTestConfig(root: string, name: string): string | undefined {
    return ['ts', 'mts', 'mjs', 'js', 'cts', 'cjs']
        .map((extension) => resolve(root, `${name}.config.${extension}`))
        .find((path) => existsSync(path));
}
