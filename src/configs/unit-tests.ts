import { createRstestConfig } from '@koslibs/configs/rstest';
import { createReactRstestConfig } from '@koslibs/configs/rstest/react';
import type { RstestConfig } from '@rstest/core';

import type { ProjectKind } from '../typings/testing.js';

export function createUnitTestConfig(kind: ProjectKind, root = process.cwd()): RstestConfig {
    const overrides: RstestConfig = {
        root,
        include: [
            'src/**/*.{test,spec}.{ts,tsx,js,jsx,mjs}',
            'tests/**/*.{test,spec}.{ts,tsx,js,mjs}',
        ],
        coverage: { provider: 'istanbul', include: ['src/**/*.{ts,tsx}'] },
    };
    return kind === 'ui' ? createReactRstestConfig(overrides) : createRstestConfig(overrides);
}
