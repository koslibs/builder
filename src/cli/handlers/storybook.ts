import { resolve } from 'node:path';

import { DEFAULT_PORT } from '../../configs/defaults.js';
import { writeGeneratedConfig } from '../../configs/generated.js';
import { loadBuilderConfig } from '../../configs/load.js';
import { packageBin } from '../../utils/packages.js';
import { runNode } from '../process.js';

import { typecheck, watchTypecheck } from './typecheck.js';

export async function runStorybook(command: string, root: string, args: string[]): Promise<number> {
    const config = await loadBuilderConfig(root);
    const generated = await writeGeneratedConfig(
        root,
        'storybook',
        `import { createStorybookConfig } from ${JSON.stringify(new URL('../../storybook/index.js', import.meta.url).href)};\n` +
            `export default await createStorybookConfig(${JSON.stringify(root)});\n`
    );
    const dev = command.endsWith(':start');
    if (!dev) {
        const code = await typecheck(root);
        if (code !== 0) {
            return code;
        }
    }
    const flags = dev
        ? [
              'dev',
              '--port',
              String(config.port ?? config.rsbuildConfig?.server?.port ?? DEFAULT_PORT),
              '--exact-port',
              '--no-open',
          ]
        : ['build', '--output-dir', resolve(root, 'storybook-static')];
    const controller = new AbortController();
    const result = runNode(
        packageBin('storybook', 'storybook'),
        [...flags, '--config-dir', generated.directory, '--disable-telemetry', ...args],
        root,
        controller.signal
    );
    if (!dev) {
        return result;
    }
    const stop = await watchTypecheck(root, async () => {
        controller.abort();
        await result;
    });
    try {
        return await result;
    } finally {
        await stop();
    }
}
