# Chrome Web Store — nội dung nộp

Dán theo từng ô trong Developer Dashboard. Gói nộp: `store/page2markdown-0.1.0.zip`.

## Store listing

**Name**

```
Page2Markdown
```

**Summary** (tối đa 132 ký tự)

```
Save any web page — or just your selection — as clean Markdown with YAML frontmatter. Built for Obsidian.
```

**Description**

```
Page2Markdown turns the page you are reading into a clean Markdown file, ready to drop into Obsidian, Logseq, or any notes folder.

CAPTURE, THEN EDIT
Every capture opens a full editor tab, not a cramped popup: formatting toolbar, live preview beside your text, and room to fix things before you save.
• Click the toolbar icon, press Ctrl+Shift+M (Cmd+Shift+M on Mac), or right-click and choose "Save Page To Markdown".
• Highlight a passage first and only that part is captured.

WHAT YOU GET
• Navigation, ads, and sidebars stripped — the article, not the furniture.
• YAML frontmatter with title, source URL, author, publication date, and capture time.
• GFM tables, code blocks that keep their language, nested lists, image captions.
• Links and images rewritten to absolute URLs so the file still works away from the browser.

MAKE IT YOURS
• Pick which frontmatter fields appear, and add default tags.
• Filename templates: {title} {slug} {domain} {date} {time} {timestamp} — a "/" creates a subfolder.
• Choose how images are handled: keep them, keep only alt text, or drop them.
• Set heading style, bullet marker, and fenced or indented code blocks.

PRIVACY
Page2Markdown has no server and no account. Nothing you capture leaves your computer. It reads a page only when you ask it to, and only the page you are on. No trackers, no analytics, no ads.
```

**Category**: Productivity / Workflow & Planning
**Language**: English

## Privacy practices

**Single purpose**

```
Page2Markdown converts the web page the user is currently viewing into a Markdown file that the user saves or copies. Every feature serves that one purpose.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `activeTab` | Reads the content of the page the user is on, only after the user clicks the toolbar icon, presses the shortcut, or uses the context menu. Chosen over host permissions so the extension has no standing access to any site. |
| `scripting` | Injects the extraction script into that tab on demand to convert its DOM to Markdown. |
| `downloads` | Writes the generated Markdown file to the user's Downloads folder. |
| `storage` | Stores the user's own settings, and holds the captured Markdown for a moment while the editor tab opens. That draft is deleted once saved, and after 24 hours in any case. Nothing is sent anywhere. |
| `contextMenus` | Adds the "Save Page To Markdown" right-click entry. |

**Remote code**: No. Everything ships inside the package; no code is fetched at runtime.

**Data usage** — tick *"I do not collect or use user data"*. The extension has no backend, no analytics, and makes no network requests of its own.

**Donation link** — the editor and the settings page carry an optional "Buy me a coffee" link that opens an external page. No payment is processed inside the extension, which Chrome Web Store does not allow. Leave `DONATE_URL` empty and the button never renders.

## Assets

| Ô | File |
| --- | --- |
| Store icon 128×128 | `dist/icons/icon128.png` |
| Screenshot 1280×800 | `store/screenshots/01-preview.png` |
| Screenshot 1280×800 | `store/screenshots/02-settings.png` |
| Screenshot 1280×800 | `store/screenshots/03-ways.png` |
| Ảnh gốc độ phân giải cao (nếu cần) | `store/icon512-store.png` |

## Việc còn phải tự quyết

- **Privacy policy URL** — Chrome yêu cầu ô này nếu extension chạm vào nội dung trang, kể cả khi không thu thập gì. Cần một URL public (GitHub Pages hay một trang tĩnh cũng được).
- **Distribution**: public hay unlisted, và vùng phát hành.
- **Contact email** đã xác minh trong tài khoản developer.
