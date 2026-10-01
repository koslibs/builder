import { describe, expect, test } from '@rstest/core';

import { createUnitTestConfig } from '../../src/configs/unit-tests.js';

describe('project configuration contract', () => {
    test('uses shared Rstest presets with distinct UI and library environments', () => {
        expect(createUnitTestConfig('ui').testEnvironment).toBe('happy-dom');
        expect(createUnitTestConfig('lib').testEnvironment).toBe('node');
        expect(createUnitTestConfig('ui').passWithNoTests).toBe(false);
    });
});
