import type { EnvironmentConfig, RsbuildConfig } from '@rsbuild/core';

/** Unknown properties are ignored by the CLI; only these fields are public. */
export interface KoslibsBuilderConfig {
    rsbuildConfig?: RsbuildConfig;
    clientConfig?: EnvironmentConfig;
    /** Shared dev-server port. Defaults to 8080. */
    port?: number;
}
