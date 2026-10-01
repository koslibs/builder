import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function writeGeneratedConfig(root: string, name: string, source: string) {
    const directory = resolve(root, '.cache/koslibs-builder', name);
    await mkdir(directory, { recursive: true });
    const file = resolve(directory, 'main.mjs');
    await writeFile(file, source, 'utf8');
    return { directory, file };
}

export async function writeLibraryTsconfig(root: string): Promise<void> {
    const directory = resolve(root, '.cache/koslibs-builder/lib');
    await mkdir(directory, { recursive: true });
    const src = resolve(root, 'src').replaceAll('\\', '/');
    await writeFile(
        resolve(directory, 'tsconfig.lib.json'),
        JSON.stringify(
            {
                extends: resolve(root, 'tsconfig.json'),
                compilerOptions: { rootDir: src },
                include: [src],
                exclude: [`${src}/**/*.test.*`, `${src}/**/*.spec.*`, `${src}/**/*.stories.*`],
            },
            null,
            4
        ),
        'utf8'
    );
}
