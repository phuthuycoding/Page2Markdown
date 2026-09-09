# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commit prefixes decide the next version:
`fix` → patch, `feat` → minor, `!` or `BREAKING CHANGE` → major.

## [Unreleased]

## [0.1.0] — 2026-09-08

First release. [Live on the Chrome Web Store](https://chromewebstore.google.com/detail/page2markdown/knlheklmhjhcgpdccgfapfkikddmdgbo) since 9 September 2026.

### Added

- Capture the current page — or the current selection — as Markdown with YAML frontmatter, from the
  toolbar icon, `Ctrl/Cmd+Shift+M`, or the right-click menu.
- An editor tab with a formatting toolbar and live preview, so the file can be fixed before it is
  saved. Saving writes exactly what is on screen.
- Extraction that keeps what matters: GFM tables, fenced code blocks with their language, nested
  lists indented to the width CommonMark requires, image captions, absolute URLs, and recovered
  lazy-loaded image sources.
- Settings for frontmatter fields, default tags, filename templates (`{title}` `{slug}` `{domain}`
  `{date}` `{time}` `{timestamp}`, with `/` creating a subfolder), image handling, and Markdown style.
- A project site at <https://phuthuycoding.github.io/Page2Markdown/> with the privacy policy.

### Security

- The preview renders inside a sandboxed `<iframe>`. Page content comes from untrusted sites, and
  extension pages hold `chrome.*` privileges, so that content is never allowed to execute there.
- The extension requests `activeTab` rather than host permissions: it can read nothing until the
  user asks, and has no standing access to any site.

[unreleased]: https://github.com/phuthuycoding/Page2Markdown/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/phuthuycoding/Page2Markdown/releases/tag/v0.1.0
