import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { verifyStorybook } from './storybook-browser.mjs';

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
await writeFile(
    resolve(lib, '.env.production'),
    'PUBLIC_STORYBOOK_MESSAGE=storybook-public-value\nPRIVATE_STORYBOOK_TOKEN=storybook-private-value'
);
await mkdir(resolve(lib, '.storybook'), { recursive: true });
await writeFile(
    resolve(lib, '.storybook/preview.tsx'),
    `declare const __STORYBOOK_MARKER__: string;\n` +
        `export default { decorators: [(Story: any) => <section data-build-marker={__STORYBOOK_MARKER__} data-public-env={import.meta.env.PUBLIC_STORYBOOK_MESSAGE}><Story /></section>] };\n`
);
await writeFile(
    resolve(lib, 'koslibs-builder.ts'),
    `export default { storybookViteConfig: { define: { __STORYBOOK_MARKER__: JSON.stringify('storybook-vite-setting') } } };\n`
);
await mkdir(resolve(lib, 'public'), { recursive: true });
await writeFile(resolve(lib, 'public/probe.txt'), 'storybook-public-file');
await run('storybook:build', lib);
assert.ok((await readdir(resolve(lib, 'storybook-static'))).includes('index.html'));
const storybookAssets = (await readdir(resolve(lib, 'storybook-static/assets'))).filter((file) =>
    file.endsWith('.js')
);
const storybookJs = (
    await Promise.all(
        storybookAssets.map((file) =>
            readFile(resolve(lib, 'storybook-static/assets', file), 'utf8')
        )
    )
).join('\n');
assert.ok(storybookJs.includes('storybook-public-value'), 'Storybook loads PUBLIC_ env values');
assert.ok(storybookJs.includes('storybook-vite-setting'), 'Storybook uses storybookViteConfig');
assert.ok(
    !storybookJs.includes('storybook-private-value'),
    'Storybook excludes private env values'
);

const badUi = await fixture('invalid ui', 'ui');
await writeFile(resolve(badUi, 'src/type-error.ts'), "export const bad: number = 'wrong';");
assert.match(await run('ui:build', badUi, [], 1), /TS2322/);
const badLib = await fixture('invalid lib', 'lib');
await writeFile(resolve(badLib, 'src/type-error.ts'), "export const bad: number = 'wrong';");
assert.match(await run('lib:build', badLib, [], 1), /TS2322/);
assert.match(await run('storybook:build', badLib, [], 1), /TS2322/);
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
        () => /Found 0 errors/.test(devOutput.slice(outputBeforeFix)),
        'background checker clears diagnostics after correction',
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
    const libraryOutputBeforeFix = libraryWatchOutput.length;
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
    await waitFor(
        () => /Found 0 errors/.test(libraryWatchOutput.slice(libraryOutputBeforeFix)),
        'library checker clears diagnostics after correction',
        () => libraryWatchOutput
    );
    assert.equal(libraryWatch.exitCode, null, 'watch must stay alive after a type error');
    await run('lib:typecheck', badLib);
    console.info('PASS library watch, background type checking and recovery');
} finally {
    stopChild(libraryWatch);
    await writeFile(resolve(directory, 'lib-watch.log'), libraryWatchOutput);
}

// Exercise graceful watcher shutdown independently of Windows' forced process termination.
const watcherModule = pathToFileURL(resolve(root, 'dist/cli/handlers/typecheck.js')).href;
const shutdownScript = resolve(directory, 'watcher-shutdown.mjs');
await writeFile(
    shutdownScript,
    `import { watchTypecheck } from ${JSON.stringify(watcherModule)};\n` +
        `const stop = await watchTypecheck(${JSON.stringify(ui)}, async () => console.log('OWNER CLOSED'));\n` +
        `await Promise.all([stop(), stop()]);\nconsole.log('CHECKER STOPPED');\n`
);
const shutdown = spawnSync(process.execPath, [shutdownScript], {
    encoding: 'utf8',
    timeout: 20000,
});
assert.ifError(shutdown.error);
assert.equal(shutdown.status, 0, shutdown.stdout + shutdown.stderr);
assert.match(shutdown.stdout, /CHECKER STOPPED/);
assert.equal(shutdown.stdout.match(/OWNER CLOSED/g)?.length, 1);
console.info('PASS type checker shutdown and idempotent owner cleanup');

const failureScript = resolve(directory, 'watcher-failure.mjs');
await writeFile(
    failureScript,
    `import { watchTypecheck } from ${JSON.stringify(watcherModule)};\n` +
        `await watchTypecheck(${JSON.stringify(directory)}, async () => console.log('OWNER CLOSED'));\n`
);
const failure = spawnSync(process.execPath, [failureScript], { encoding: 'utf8', timeout: 20000 });
assert.ifError(failure.error);
assert.equal(failure.status, 1, failure.stdout + failure.stderr);
assert.match(failure.stdout, /OWNER CLOSED/);
assert.match(failure.stderr, /exited unexpectedly/);
console.info('PASS unexpected type checker exit stops its owner');

const storybookPort = await freePort();
await writeFile(resolve(badLib, 'src/type-error.ts'), "export const bad: number = 'wrong';");
const storybookDev = spawn(
    process.execPath,
    [cli, 'storybook:start', '--root', badLib, '--port', String(storybookPort)],
    {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
    }
);
let storybookOutput = '';
storybookDev.stdout.on('data', (data) => {
    storybookOutput += data;
});
storybookDev.stderr.on('data', (data) => {
    storybookOutput += data;
});
try {
    await waitFor(
        async () => {
            try {
                return (await fetch(`http://localhost:${storybookPort}/index.json`)).ok;
            } catch {
                return false;
            }
        },
        'Storybook dev starts despite type errors',
        () => storybookOutput
    );
    await waitFor(
        () => /TS2322/.test(storybookOutput),
        'Storybook background type check',
        () => storybookOutput
    );
    const outputBeforeFix = storybookOutput.length;
    await writeFile(resolve(badLib, 'src/type-error.ts'), 'export const bad: number = 1;');
    await waitFor(
        () => /Found 0 errors/.test(storybookOutput.slice(outputBeforeFix)),
        'Storybook checker recovery',
        () => storybookOutput
    );
    console.info('PASS Storybook dev, background type checking and recovery');
} finally {
    stopChild(storybookDev);
    await writeFile(resolve(directory, 'storybook-dev.log'), storybookOutput);
}

if (process.env.KOSLIBS_BROWSER_TESTS === '1') {
    await run('ui:test:e2e', ui);
    await verifyStorybook(lib);
}
console.info('Integration checks passed.');
