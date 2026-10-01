import { findTestConfig } from '../../configs/find-test.js';
import { writeGeneratedConfig } from '../../configs/generated.js';
import type { ProjectKind } from '../../typings/testing.js';
import { packageBin } from '../../utils/packages.js';
import { runNode } from '../process.js';

export async function runTests(command: string, root: string, args: string[]): Promise<number> {
    const [kind] = command.split(':') as [ProjectKind];
    const browser = command.endsWith(':e2e') || command.endsWith(':screenshots');
    let file = findTestConfig(root, browser ? 'playwright' : 'rstest');
    if (!file) {
        const module = new URL('../../testing/index.js', import.meta.url).href;
        const expression = browser
            ? `await createBrowserTestConfig(${JSON.stringify(kind)}, ${JSON.stringify(command.endsWith(':screenshots') ? 'screenshots' : 'e2e')}, ${JSON.stringify(root)})`
            : `createUnitTestConfig(${JSON.stringify(kind)}, ${JSON.stringify(root)})`;
        const generated = await writeGeneratedConfig(
            root,
            browser ? 'playwright' : 'rstest',
            `import { createBrowserTestConfig, createUnitTestConfig } from ${JSON.stringify(module)};\n` +
                `export default ${expression};\n`
        );
        file = generated.file;
    }
    if (browser) {
        const filter = command.endsWith(':screenshots')
            ? ['--grep', '@screenshots']
            : ['--grep-invert', '@screenshots'];
        // Generated configs select by filename; custom configs use the shared @screenshots tag.
        return runNode(
            packageBin('@playwright/test', 'playwright'),
            [
                'test',
                '--config',
                file,
                ...(findTestConfig(root, 'playwright') ? filter : []),
                ...args,
            ],
            root
        );
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
