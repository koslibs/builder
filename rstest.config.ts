import { createRstestConfig } from '@koslibs/configs/rstest';
import { defineConfig } from '@rstest/core';

export default defineConfig(createRstestConfig({ include: ['tests/**/*.test.ts'] }));
