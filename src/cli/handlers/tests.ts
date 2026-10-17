import { findTestConfig } from '../../configs/find-test.js';
import { writeGeneratedConfig } from '../../configs/generated.js';
import type { ProjectKind } from '../../typings/testing.js';
import { packageBin } from '../../utils/packages.js';
import { runNode } from '../process.js';

export async function runTests(command: string, root: string, args: string[]): Promise<number> {
    const [kind] = command.split(':') as [ProjectKind];
    let file = findTestConfig(root, 'rstest');
    if (!file) {
        const module = new URL('../../testing/index.js', import.meta.url).href;
        const generated = await writeGeneratedConfig(
            root,
            'rstest',
            `import { createUnitTestConfig } from ${JSON.stringify(module)};\n` +
                `export default createUnitTestConfig(${JSON.stringify(kind)}, ${JSON.stringify(root)});\n`
        );
        file = generated.file;
    }
    return runNode(
        packageBin('@rstest/core', 'rstest'),
        [
            command.endsWith(':watch') ? 'watch' : 'run',
            '--config',
            file,
            ...(command.endsWith(':coverage') ? ['--coverage'] : []),
            ...args,
        ],
        root
    );
}
