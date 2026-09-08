# Contributing to Page2Markdown

Thanks for taking the time. Bug reports, ideas, and pull requests are all welcome.

## Getting set up

```bash
git clone https://github.com/phuthuycoding/Page2Markdown.git
cd Page2Markdown
bun install     # also installs the git hooks
bun run build
```

Then load it in Chrome: open `chrome://extensions`, turn on **Developer mode**, choose **Load
unpacked**, and select the `dist` folder. `bun run dev` rebuilds on change — reload the extension
from that page to pick it up.

The `bun install` step points `core.hooksPath` at `.githooks`, so formatting and commit-message
checks run automatically from then on. If you cloned before that existed, run `bun run prepare`.

## Before you open a pull request

```bash
bun run check      # format + typecheck + lint + unit tests + build
bun run test:e2e   # drives a real Chrome against the built extension
```

`test:e2e` needs a Chrome that Playwright can drive: `bunx playwright install chromium`.

## How the code is organised

| Path              | What lives there                                                   |
| ----------------- | ------------------------------------------------------------------ |
| `src/background/` | Service worker: toolbar icon, shortcut, context menu, welcome page |
| `src/content/`    | Everything that runs inside the captured page                      |
| `src/editor/`     | The editor tab: toolbar commands, preview, wiring                  |
| `src/options/`    | Settings page                                                      |
| `src/services/`   | Settings, capture, download, draft handover                        |
| `src/utils/`      | Filenames and frontmatter — pure functions, easy to test           |
| `docs/`           | The project site, published by GitHub Pages                        |

Two constraints worth knowing before you move code around:

- **Capture has to happen in the service worker.** `activeTab` only lives for the moment the user
  acted; the editor is a different tab with no rights over the original page.
- **Preview renders in a sandboxed iframe.** Extension pages hold `chrome.*` privileges, so page
  content from an untrusted site must never run there.

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg`
hook enforces it, and the subject line is capped at 72 characters.

```
<type>(<optional scope>): <description>
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert`. Add `!` after the type or scope for a breaking change.

```
feat(editor): add word count to the toolbar
fix(download): wait for the download to finish before reporting success
docs: explain why capture happens in the service worker
feat(api)!: drop support for Chrome 115
```

The prefix is not decoration — it decides the next version number and is what the changelog is
generated from.

## Code style

Prettier owns formatting; ESLint owns everything else. Both run on staged files before each commit,
so you should never have to think about it. If you want to run them by hand:

```bash
bun run format
bun run lint
```

A few things the tools cannot check, but reviewers will look for:

- **Comments explain _why_, not _what_.** The code already says what it does. A comment earns its
  place by recording a constraint, a trade-off, or a trap someone would otherwise fall into.
- **Errors are never swallowed.** Catch only what you can actually handle; otherwise let it
  propagate, or wrap it with context and rethrow. Every `catch` should be able to answer: am I
  handling this, or hiding it?
- **Keep files focused.** Past ~500 lines, a file is usually doing more than one job.

## Tests

| File                              | Covers                                        |
| --------------------------------- | --------------------------------------------- |
| `tests/extract.test.ts`           | Extraction against a real DOM via jsdom       |
| `tests/filename.test.ts`          | Slugs, forbidden characters, path traversal   |
| `tests/markdown.test.ts`          | YAML frontmatter that survives awkward titles |
| `tests/markdown-commands.test.ts` | Every toolbar button, including toggling off  |
| `tests/config.test.ts`            | Welcome-page timing, donate configuration     |
| `tests/e2e/`                      | The built extension inside a real Chrome      |

A bug fix should come with a test that fails before the fix. Write the assertion so that it would
catch the bug you actually found, not merely exercise the line you changed.

One thing the e2e suite deliberately does **not** cover: the injection path itself. The extension
asks only for `activeTab`, and Chrome grants that solely on a genuine user gesture — there is no
legitimate way to fake one from outside. Extraction is covered by the jsdom tests instead.

## Reporting a bug

Please include the page URL you were capturing (if it is public), what you expected, what happened,
your Chrome version, and anything in the console — right-click the extension icon, choose **Inspect
service worker**, and copy what is there.

## Scope

Page2Markdown converts the page you are on into a Markdown file. Features that serve that purpose
are welcome. Features that would require a server, an account, or sending your data anywhere are
not — that constraint is the point of the extension, not an oversight.
