import { expect, test } from '@koslibs/builder/rstest';

test('library unit tests run in Node', () => {
    expect(typeof process.version).toBe('string');
    expect(typeof document).toBe('undefined');
});
