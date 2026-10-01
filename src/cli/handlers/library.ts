import { writeLibraryTsconfig } from '../../configs/generated.js';
import { createLibraryConfig } from '../../configs/library.js';
import { loadBuilderConfig } from '../../configs/load.js';
import { closeOnSignal } from '../process.js';

export async function runLibrary(command: string, root: string): Promise<void> {
    const config = await loadBuilderConfig(root);
    const { createRslib } = await import('@rslib/core');
    await writeLibraryTsconfig(root);
    const rslib = await createRslib({
        cwd: root,
        config: createLibraryConfig(config, root, command === 'lib:watch'),
    });
    const result = await rslib.build({ watch: command === 'lib:watch' });
    if (command === 'lib:watch') {
        closeOnSignal(() => result.close());
    } else {
        await result.close();
    }
}
