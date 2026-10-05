import type { EnvironmentConfig, RsbuildConfig } from '@rsbuild/core';
import type { UserConfig } from 'vite';

/** Unknown properties are ignored by the CLI; only these fields are public. */
export interface KoslibsBuilderConfig {
    rsbuildConfig?: RsbuildConfig;
    clientConfig?: EnvironmentConfig;
    /** Vite options used only by Storybook. */
    storybookViteConfig?: UserConfig;
    /** Shared dev-server port. Defaults to 8080. */
    port?: number;
}
