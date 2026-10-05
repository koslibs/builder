# @koslibs/builder

## 1.0.0

### Major Changes

- [#1](https://github.com/koslibs/builder/pull/1) [`79bd508`](https://github.com/koslibs/builder/commit/79bd5081d2dd824ec80a5249de4a9181a384563b) Thanks [@holypower777](https://github.com/holypower777)! - Update the shared toolchain and require @koslibs/configs 1.x. Replace the type-check plugin with tsc and background tsc --watch, and move Storybook to Vite to remove the vulnerable braces dependency chain. Application and library builds continue to use Rspack.

    Add storybookViteConfig for Storybook-specific settings and expose Docs components and types through @koslibs/builder/storybook/blocks. Storybook customizations previously supplied through Rsbuild settings must be migrated to storybookViteConfig.

    Adopt shared Changesets release workflows, changelog generation and Git hooks from @koslibs/configs.
