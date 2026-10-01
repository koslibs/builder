import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

const require = createRequire(import.meta.url);
export const typescriptPath = require.resolve('typescript');

export function typeCheckPlugin(root: string) {
    return pluginTypeCheck({
        tsCheckerOptions: {
            typescript: { configFile: resolve(root, 'tsconfig.json'), typescriptPath },
        },
    });
}
