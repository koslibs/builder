---
'@koslibs/builder': major
---

Require @koslibs/configs 3.x and replace Happy DOM with jsdom 29.1.1 for UI unit tests to remove the vulnerable Happy DOM dependency chain. Update explicit happy-dom test environments to jsdom and adapt tests that use Happy DOM-specific APIs. Library tests continue to use Node.js.

Refresh fast-uri to 3.1.9 in the lockfile to fix URI normalization vulnerabilities.
