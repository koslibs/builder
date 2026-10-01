import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseArgs } from './args.js';
import { COMMANDS } from './commands.js';
import { runLibrary } from './handlers/library.js';
import { runStorybook } from './handlers/storybook.js';
import { runTests } from './handlers/tests.js';
import { typecheck } from './handlers/typecheck.js';
import { runUi } from './handlers/ui.js';

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
    const { command, root, help, args } = parseArgs(argv);
    if (help || !command) {
        console.info(
            `Usage: koslibs-builder <command> [--root <directory>]\n\n${COMMANDS.join('\n')}\n\nTest and Storybook flags are forwarded to the underlying CLI.`
        );
        return 0;
    }
    process.chdir(root);
    process.env.NODE_ENV = 'production';
    if (command.includes(':test')) {
        process.env.NODE_ENV = 'test';
    } else if (command.endsWith(':start') || command.endsWith(':watch')) {
        process.env.NODE_ENV = 'development';
    }
    if (command.startsWith('storybook:') || command === 'lib:start') {
        return runStorybook(command, root, args);
    }
    if (command.includes(':test')) {
        return runTests(command, root, args);
    }
    if (args.length) {
        throw new Error(
            `Unexpected argument "${args[0]}". Set build options in koslibs-builder.ts.`
        );
    }
    if (!existsSync(resolve(root, 'tsconfig.json'))) {
        throw new Error('tsconfig.json is required. Extend a preset from @koslibs/configs.');
    }
    if (command.endsWith(':typecheck')) {
        return typecheck(root);
    }
    // Check the entire TS project (including the builder config), not only imported modules.
    if (command.endsWith(':build')) {
        const code = await typecheck(root);
        if (code !== 0) {
            return code;
        }
    }
    if (command.startsWith('ui:')) {
        await runUi(command, root);
    } else {
        await runLibrary(command, root);
    }
    return 0;
}
