import { spawn } from 'node:child_process';

export function runNode(bin: string, args: string[], root: string): Promise<number> {
    return new Promise((resolveCode, reject) => {
        const child = spawn(process.execPath, [bin, ...args], { cwd: root, stdio: 'inherit' });
        const stop = () => child.kill('SIGTERM');
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        const removeListeners = () => {
            process.removeListener('SIGINT', stop);
            process.removeListener('SIGTERM', stop);
        };
        child.once('error', (error) => {
            removeListeners();
            reject(error);
        });
        child.once('exit', (code, signal) => {
            removeListeners();
            resolveCode(code ?? (signal ? 130 : 1));
        });
    });
}

export function closeOnSignal(close: () => Promise<void>): void {
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
}
