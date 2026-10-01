import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const cli = resolve(root, manifest.bin['koslibs-builder']);
await mkdir(resolve(root, '.cache/integration'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.cache/integration/run-'));
console.info(`Integration artifacts: ${directory}`);

async function fixture(name, example) {
    const path = resolve(directory, name);
    await cp(resolve(root, 'examples', example), path, {
        recursive: true,
        filter: (entry) =>
            !entry.includes('node_modules') && !entry.includes('dist') && !entry.includes('.cache'),
    });
    await mkdir(resolve(path, 'node_modules/@koslibs'), { recursive: true });
    await symlink(
        root,
        resolve(path, 'node_modules/@koslibs/builder'),
        process.platform === 'win32' ? 'junction' : 'dir'
    );
    return path;
}

function stopChild(child) {
    if (process.platform === 'win32' && child.exitCode === null) {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
        child.kill('SIGTERM');
    }
}

async function run(command, project, args = [], expected = 0) {
    const result = await new Promise((resolveResult, reject) => {
        const child = spawn(process.execPath, [cli, command, '--root', project, ...args], {
            cwd: root,
            env: { ...process.env, CI: 'true' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        child.stdout.on('data', (data) => {
            output += data;
        });
        child.stderr.on('data', (data) => {
            output += data;
        });
        const timeout = setTimeout(() => {
            stopChild(child);
            reject(new Error(`${command} timed out\n${output}`));
        }, 180000);
        child.once('error', reject);
        child.once('exit', (code) => {
            clearTimeout(timeout);
            resolveResult({ code, output });
        });
    });
    await writeFile(
        resolve(directory, `${command.replaceAll(':', '-')}-${project.split(/[\\/]/).at(-1)}.log`),
        result.output
    );
    if (expected === 0) {
        assert.equal(result.code, 0, `${command} failed:\n${result.output}`);
    } else {
        assert.notEqual(result.code, 0, `${command} should have failed:\n${result.output}`);
    }
    console.info(`PASS ${command} (${expected === 0 ? 'success' : 'expected failure'})`);
    return result.output;
}

async function freePort() {
    const server = createServer();
    await new Promise((resolveListening) => server.listen(0, '127.0.0.1', resolveListening));
    const { port } = server.address();
    await new Promise((resolveClose) => server.close(resolveClose));
    return port;
}

async function waitFor(check, label, getOutput) {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (await check()) {
            return;
        }
        await delay(200);
    }
    throw new Error(`Timed out: ${label}\n${getOutput()}`);
}

const ui = await fixture('ui project', 'ui');
await writeFile(
    resolve(ui, '.env.production'),
    'PUBLIC_API_URL=https://api.example.test\nPRIVATE_TOKEN=never-in-client'
);
await run('ui:build', ui);
assert.match(await readFile(resolve(ui, 'dist/index.html'), 'utf8'), /static\/js/);
const jsFiles = (await readdir(resolve(ui, 'dist/static/js'), { recursive: true })).filter((file) =>
    file.endsWith('.js')
);
assert.ok(jsFiles.length >= 3, 'expected entry, vendor and dynamic chunks');
const js = (
    await Promise.all(jsFiles.map((file) => readFile(resolve(ui, 'dist/static/js', file), 'utf8')))
).join('\n');
assert.ok(js.includes('https://api.example.test'), 'public .env variable should be injected');
assert.ok(!js.includes('never-in-client'), 'private .env variable should not be injected');
assert.ok(
    (await readdir(resolve(ui, 'dist/static/css'))).length > 0,
    'CSS Modules should emit CSS'
);
await run('ui:test', ui);
await run('ui:test:coverage', ui);
await run('ui:test:e2e', ui, ['--list']);
await run('ui:test:screenshots', ui, ['--list']);

const lib = await fixture('lib project', 'lib');
await run('lib:build', lib);
const files = await readdir(resolve(lib, 'dist'));
assert.ok(files.includes('index.js') && files.includes('index.d.ts'));
assert.ok(!files.some((file) => file.endsWith('.cjs')));
assert.match(await readFile(resolve(lib, 'dist/button.js'), 'utf8'), /react\/jsx-runtime/);
assert.ok(
    !files.some((file) => file.includes('.test.') || file.includes('.stories.')),
    'tests and stories should not be published'
);
await run('lib:test', lib);
await run('storybook:build', lib);
assert.ok((await readdir(resolve(lib, 'storybook-static'))).includes('index.html'));

const badUi = await fixture('invalid ui', 'ui');
await writeFile(resolve(badUi, 'src/type-error.ts'), "export const bad: number = 'wrong';");
assert.match(await run('ui:build', badUi, [], 1), /TS2322/);
const badLib = await fixture('invalid lib', 'lib');
await writeFile(resolve(badLib, 'src/type-error.ts'), "export const bad: number = 'wrong';");
assert.match(await run('lib:build', badLib, [], 1), /TS2322/);
await run('ui:typo', ui, [], 1);

const port = await freePort();
await writeFile(
    resolve(badUi, 'koslibs-builder.ts'),
    `export default { port: ${port}, ignored: true };`
);
const dev = spawn(process.execPath, [cli, 'ui:start', '--root', badUi], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
});
let devOutput = '';
dev.stdout.on('data', (data) => {
    devOutput += data;
});
dev.stderr.on('data', (data) => {
    devOutput += data;
});
try {
    await waitFor(
        async () => {
            try {
                return (await fetch(`http://localhost:${port}`)).ok;
            } catch {
                return false;
            }
        },
        'UI dev server starts despite type errors',
        () => devOutput
    );
    await waitFor(
        () => /TS2322/.test(devOutput),
        'background TypeScript diagnostics',
        () => devOutput
    );
    const outputBeforeFix = devOutput.length;
    await writeFile(resolve(badUi, 'src/type-error.ts'), 'export const bad: number = 1;');
    await waitFor(
        () => /ready\s+built/.test(devOutput.slice(outputBeforeFix)),
        'development recompiles after correction',
        () => devOutput
    );
    await run('ui:typecheck', badUi);
    console.info('PASS UI dev server, background type checking and recovery');
} finally {
    stopChild(dev);
    await writeFile(resolve(directory, 'ui-dev.log'), devOutput);
}

const libraryWatch = spawn(process.execPath, [cli, 'lib:watch', '--root', badLib], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
});
let libraryWatchOutput = '';
libraryWatch.stdout.on('data', (data) => {
    libraryWatchOutput += data;
});
libraryWatch.stderr.on('data', (data) => {
    libraryWatchOutput += data;
});
try {
    await waitFor(
        () => /TS2322/.test(libraryWatchOutput),
        'library background type checking',
        () => libraryWatchOutput
    );
    await writeFile(resolve(badLib, 'src/type-error.ts'), 'export const bad: number = 1;');
    await waitFor(
        async () => {
            try {
                const declaration = await readFile(resolve(badLib, 'dist/type-error.d.ts'), 'utf8');
                const implementation = await readFile(
                    resolve(badLib, 'dist/type-error.js'),
                    'utf8'
                );
                return declaration.includes('number') && /bad\s*=\s*1/.test(implementation);
            } catch {
                return false;
            }
        },
        'library declarations recover after type fix',
        () => libraryWatchOutput
    );
    assert.equal(libraryWatch.exitCode, null, 'watch must stay alive after a type error');
    await run('lib:typecheck', badLib);
    console.info('PASS library watch, background type checking and recovery');
} finally {
    stopChild(libraryWatch);
    await writeFile(resolve(directory, 'lib-watch.log'), libraryWatchOutput);
}

if (process.env.KOSLIBS_BROWSER_TESTS === '1') {
    await run('ui:test:e2e', ui);
}
console.info('Integration checks passed.');
