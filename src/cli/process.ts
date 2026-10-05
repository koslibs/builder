import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export function stopNode(child: ChildProcess): void {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
        return;
    }
    if (process.platform === 'win32') {
        const result = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
        if (result.status === 0) {
            return;
        }
    }
    child.kill('SIGTERM');
}

export function runNode(
    bin: string,
    args: string[],
    root: string,
    signal?: AbortSignal
): Promise<number> {
    return new Promise((resolveCode, reject) => {
        const child = spawn(process.execPath, [bin, ...args], { cwd: root, stdio: 'inherit' });
        const stop = () => stopNode(child);
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        signal?.addEventListener('abort', stop, { once: true });
        if (signal?.aborted) {
            stop();
        }
        const removeListeners = () => {
            process.removeListener('SIGINT', stop);
            process.removeListener('SIGTERM', stop);
            signal?.removeEventListener('abort', stop);
        };
        child.once('error', (error) => {
            removeListeners();
            reject(error);
        });
        child.once('exit', (code, exitSignal) => {
            removeListeners();
            resolveCode(code ?? (exitSignal ? 130 : 1));
        });
    });
}

export function closeOnSignal(close: () => Promise<void>): () => void {
    const stop = () => {
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
        void close().then(
            () => {
                process.exitCode = 0;
            },
            (error: unknown) => {
                console.error(error);
                process.exitCode = 1;
            }
        );
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return () => {
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
    };
}
