# Security Policy

## Supported versions

The latest release on the Chrome Web Store is the only supported version. Chrome updates extensions
automatically, so there is normally nothing older in use.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting instead:
[Report a vulnerability](https://github.com/phuthuycoding/Page2Markdown/security/advisories/new).
If that is unavailable to you, open an issue saying only that you have a security report and asking
for a private channel — no details in the issue itself.

Please include what an attacker can achieve, the steps to reproduce it, and the page or content that
triggers it. A proof of concept helps, but a clear description of the mechanism is enough.

You can expect an acknowledgement within a few days. Fixes ship as a new version to the Web Store;
Chrome then updates users automatically.

## What is in scope

The extension reads the content of a page when you ask it to, and that content is untrusted. Bugs
worth reporting include:

- Page content escaping the sandboxed preview iframe and running in an extension page
- Anything that reaches `chrome.*` APIs from content controlled by a website
- A capture writing outside the chosen download folder
- Data leaving the machine — the extension makes no network requests of its own, so any would be a bug

## What is not in scope

- Chrome refusing to run the extension on `chrome://` pages, the Web Store, or PDFs — that is Chrome's
  restriction, and it is deliberate
- Images breaking offline: files reference images by URL, they are not downloaded
- Findings from automated scanners with no demonstrated impact
