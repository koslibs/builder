import { resolve } from 'node:path';

import type { CliOptions } from '../typings/cli.js';

import { COMMANDS } from './commands.js';

export function parseArgs(argv: string[], cwd = process.cwd()): CliOptions {
    const args = [...argv];
    const command = args.shift();
    if (!command || command === '--help' || command === '-h') {
        return { root: cwd, help: true, args: [] };
    }
    if (!COMMANDS.includes(command)) {
        throw new Error(`Unknown command "${command}". Run koslibs-builder --help.`);
    }
    let root = cwd;
    const rootIndex = args.indexOf('--root');
    if (rootIndex !== -1) {
        const path = args[rootIndex + 1];
        if (!path || path.startsWith('--')) {
            throw new Error('--root requires a project directory.');
        }
        root = resolve(cwd, path);
        args.splice(rootIndex, 2);
    }
    return { command, root, help: args.includes('--help') || args.includes('-h'), args };
}
