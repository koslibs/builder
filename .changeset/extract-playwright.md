---
'@koslibs/builder': major
---

Move browser testing to the independent @koslibs/playwright package. Remove the Playwright dependency, ./playwright export, createBrowserTestConfig, BrowserTestKind, and ui/lib test:e2e and test:screenshots commands. Install @koslibs/playwright directly, import its runner/configuration, and configure webServer in the consuming project. Rstest, build and Storybook commands remain supported.

Revalidate npm registry metadata when installing the packed smoke-test consumer, so newly released dependencies are resolved even when the dedicated npm cache contains older package metadata.
