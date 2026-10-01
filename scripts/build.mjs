import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
if (relative(root, output) !== 'dist') {
    throw new Error('Build output must be the dist directory within this package.');
}
await rm(output, { recursive: true, force: true });
const require = createRequire(import.meta.url);
const result = spawnSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', resolve(root, 'tsconfig.build.json')],
    { cwd: root, stdio: 'inherit' }
);
if (result.error) {
    throw result.error;
}
process.exitCode = result.status ?? 1;
