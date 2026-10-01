import { loadBuilderConfig } from '../../configs/load.js';
import { createUiConfig } from '../../configs/ui.js';
import { closeOnSignal } from '../process.js';

export async function runUi(command: string, root: string): Promise<void> {
    const config = await loadBuilderConfig(root);
    const { createRsbuild } = await import('@rsbuild/core');
    const rsbuild = await createRsbuild({
        cwd: root,
        rsbuildConfig: createUiConfig(config, root),
        loadEnv: true,
    });
    if (command === 'ui:start') {
        const result = await rsbuild.startDevServer();
        closeOnSignal(() => result.server.close());
    } else if (command === 'ui:preview') {
        const result = await rsbuild.preview();
        closeOnSignal(() => result.server.close());
    } else {
        const result = await rsbuild.build();
        await result.close();
    }
}
