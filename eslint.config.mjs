import config from '@koslibs/configs/eslint';

export default [
    {
        ignores: [
            '.cache/**',
            '.rstack/**',
            'coverage/**',
            'storybook-static/**',
            'examples/**/dist/**',
        ],
    },
    ...config,
];
