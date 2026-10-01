import { resolve } from 'node:path';

import { describe, expect, test } from '@rstest/core';

import { parseArgs } from '../../src/cli/args.js';

describe('project configuration contract', () => {
    test('keeps command parsing independent of project tooling', () => {
        expect(() => parseArgs(['ui:unknown'])).toThrow('Unknown command');
        expect(() => parseArgs(['ui:build', '--root'])).toThrow('--root requires');
        const options = parseArgs(['ui:test', '--root', 'app', '--coverage'], process.cwd());
        expect(options.root).toBe(resolve('app'));
        expect(options.args).toEqual(['--coverage']);
    });
});
