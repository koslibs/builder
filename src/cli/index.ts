#!/usr/bin/env node
import { runCli } from './run.js';

try {
    process.exitCode = await runCli();
} catch (error) {
    console.error(`[koslibs-builder] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
}
