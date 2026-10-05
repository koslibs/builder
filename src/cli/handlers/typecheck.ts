import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { packageBin } from '../../utils/packages.js';
import { closeOnSignal, runNode, stopNode } from '../process.js';

export async function typecheck(root: string): Promise<number> {
    return runNode(
        packageBin('typescript', 'tsc'),
        ['--project', 'tsconfig.json', '--noEmit'],
        root
    );
}

/** Owns the checker and the dev/watch resource, closing both together. */
export async function watchTypecheck(
    root: string,
    closeOwner: () => Promise<void>
): Promise<() => Promise<void>> {
    const child = spawn(
        process.execPath,
        [
            packageBin('typescript', 'tsc'),
            '--project',
            'tsconfig.json',
            '--noEmit',
            '--watch',
            '--preserveWatchOutput',
            '--pretty',
            'false',
        ],
        { cwd: root, stdio: 'inherit', windowsHide: true }
    );
    const closed = new Promise<void>((resolveClosed) => child.once('close', () => resolveClosed()));
    let stopping: Promise<void> | undefined;
    let removeSignals = () => {};
    const onExit = () => stopNode(child);
    const stop = () => {
        if (!stopping) {
            // Mark as stopping before killing: a normal shutdown is not a checker failure.
            stopping = Promise.resolve().then(async () => {
                removeSignals();
                process.removeListener('exit', onExit);
                stopNode(child);
                await Promise.all([closed, closeOwner()]);
            });
        }
        return stopping;
    };
    try {
        await once(child, 'spawn');
    } catch (error) {
        await stop();
        throw error;
    }
    child.once('close', (code) => {
        if (!stopping) {
            console.error(`[koslibs-builder] TypeScript watcher exited unexpectedly (${code}).`);
            process.exitCode = 1;
            void stop().catch((error: unknown) => console.error(error));
        }
    });
    process.once('exit', onExit);
    removeSignals = closeOnSignal(stop);
    return stop;
}
