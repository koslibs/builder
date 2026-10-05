---
'@koslibs/builder': major
---

Update the shared toolchain and require @koslibs/configs 1.x. Replace the type-check plugin with tsc and background tsc --watch, and move Storybook to Vite to remove the vulnerable braces dependency chain. Application and library builds continue to use Rspack.

Add storybookViteConfig for Storybook-specific settings and expose Docs components and types through @koslibs/builder/storybook/blocks. Storybook customizations previously supplied through Rsbuild settings must be migrated to storybookViteConfig.

Adopt shared Changesets release workflows, changelog generation and Git hooks from @koslibs/configs.
