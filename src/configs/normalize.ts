import type { KoslibsBuilderConfig } from '../typings/config.js';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeConfig(value: unknown): KoslibsBuilderConfig {
    if (!isObject(value)) {
        throw new Error('koslibs-builder.ts must default-export a configuration object.');
    }
    const { port, rsbuildConfig, clientConfig, storybookViteConfig } = value;
    if (
        port !== undefined &&
        (!Number.isInteger(port) || Number(port) < 1 || Number(port) > 65535)
    ) {
        throw new Error('port must be an integer between 1 and 65535.');
    }
    for (const [name, field] of Object.entries({
        rsbuildConfig,
        clientConfig,
        storybookViteConfig,
    })) {
        if (field !== undefined && !isObject(field)) {
            throw new Error(`${name} must be a configuration object.`);
        }
    }
    return {
        port: port as number | undefined,
        rsbuildConfig: rsbuildConfig as KoslibsBuilderConfig['rsbuildConfig'],
        clientConfig: clientConfig as KoslibsBuilderConfig['clientConfig'],
        storybookViteConfig: storybookViteConfig as KoslibsBuilderConfig['storybookViteConfig'],
    };
}
