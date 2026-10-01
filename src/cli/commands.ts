export const COMMANDS = [
    'ui:start',
    'ui:build',
    'ui:preview',
    'ui:typecheck',
    'lib:start',
    'lib:watch',
    'lib:build',
    'lib:typecheck',
    'storybook:start',
    'storybook:build',
    ...(['ui', 'lib'] as const).flatMap((kind) => [
        `${kind}:test`,
        `${kind}:test:watch`,
        `${kind}:test:coverage`,
        `${kind}:test:e2e`,
        `${kind}:test:screenshots`,
    ]),
];
