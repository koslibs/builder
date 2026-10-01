declare module '@koslibs/configs/playwright' {
    import type { PlaywrightTestConfig } from '@playwright/test';
    export function createPlaywrightConfig(overrides?: PlaywrightTestConfig): PlaywrightTestConfig;
}
