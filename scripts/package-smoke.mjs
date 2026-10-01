import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmCache = resolve(root, '.cache/npm-cache');
const npm = process.env.npm_execpath;
if (!npm) {
    throw new Error('Run this check via npm run test:package.');
}

function run(file, args, cwd) {
    const result = spawnSync(process.execPath, [file, ...args], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' },
        timeout: 180000,
    });
    if (result.error) {
        throw result.error;
    }
    assert.equal(result.status, 0, `${file} ${args.join(' ')} failed`);
}

await mkdir(resolve(root, '.cache/package-smoke'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.cache/package-smoke/consumer-'));
run(npm, ['pack', '--pack-destination', directory, '--cache', npmCache], root);
const archives = (await readdir(directory)).filter((file) => file.endsWith('.tgz'));
assert.equal(archives.length, 1, 'npm pack must produce one archive');
const archive = resolve(directory, archives[0]);
const copyOptions = {
    recursive: true,
    filter: (entry) =>
        !entry
            .split(/[\\/]/)
            .some((part) =>
                [
                    'node_modules',
                    'dist',
                    '.cache',
                    'coverage',
                    'storybook-static',
                    'test-results',
                ].includes(part)
            ),
};
await cp(resolve(root, 'examples/ui'), directory, copyOptions);
const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
manifest.devDependencies = {
    '@koslibs/builder': `file:${archive.replaceAll('\\', '/')}`,
    '@koslibs/configs': '0.2.11',
    '@types/node': '24.19.0',
    '@types/react': '18.3.31',
    '@types/react-dom': '18.3.7',
};
await writeFile(resolve(directory, 'package.json'), JSON.stringify(manifest, null, 4));
run(
    npm,
    ['install', '--prefer-offline', '--no-audit', '--no-fund', '--cache', npmCache],
    directory
);
const builderRoot = resolve(directory, 'node_modules/@koslibs/builder');
const builderManifest = JSON.parse(await readFile(resolve(builderRoot, 'package.json'), 'utf8'));
const cli = resolve(builderRoot, builderManifest.bin['koslibs-builder']);
run(cli, ['ui:build'], directory);
run(cli, ['ui:test'], directory);
run(cli, ['ui:test:e2e', '--list'], directory);
assert.match(await readFile(resolve(directory, 'dist/index.html'), 'utf8'), /static\/js/);
const library = resolve(directory, 'library');
await cp(resolve(root, 'examples/lib'), library, copyOptions);
run(cli, ['lib:build', '--root', library], directory);
assert.match(await readFile(resolve(library, 'dist/index.d.ts'), 'utf8'), /Button/);
assert.match(await readFile(resolve(library, 'dist/button.js'), 'utf8'), /react\/jsx-runtime/);
console.info(`Packed consumer check passed: ${directory}`);
