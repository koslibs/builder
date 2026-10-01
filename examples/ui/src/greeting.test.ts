import { expect, test } from '@koslibs/builder/rstest';

import { greeting } from './greeting.js';

test('formats the project name', () => {
    expect(greeting('GullEye')).toBe('Hello, GullEye');
});

test('provides a DOM for UI unit tests', () => {
    const element = document.createElement('button');
    element.textContent = 'Test';
    expect(element.textContent).toBe('Test');
});
