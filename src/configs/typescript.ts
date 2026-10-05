import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const typescriptPath = require.resolve('typescript');
