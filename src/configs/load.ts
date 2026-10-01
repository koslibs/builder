import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { KoslibsBuilderConfig } from '../typings/config.js';

import { normalizeConfig } from './normalize.js';

export async function loadBuilderConfig(root: string): Promise<KoslibsBuilderConfig> {
    const path = resolve(root, 'koslibs-builder.ts');
    if (!existsSync(path)) {
        return {};
    }
    const { default: config } = await import(pathToFileURL(path).href);
    return normalizeConfig(config);
}
