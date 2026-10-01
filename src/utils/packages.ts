import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import type { PackageBinManifest } from '../typings/packages.js';

const require = createRequire(import.meta.url);

export function packageDirectory(name: string): string {
    return dirname(require.resolve(`${name}/package.json`));
}

export function packageBin(name: string, bin: string): string {
    const root = packageDirectory(name);
    const manifest = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8')
    ) as PackageBinManifest;
    const entry = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[bin];
    if (!entry) {
        throw new Error(`${name} does not provide the ${bin} executable.`);
    }
    return resolve(root, entry);
}
