export function quote(value: string): string {
    // Playwright executes webServer.command through the platform shell.
    return process.platform === 'win32'
        ? `"${value.replaceAll('"', '')}"`
        : `'${value.replaceAll("'", "'\\''")}'`;
}
