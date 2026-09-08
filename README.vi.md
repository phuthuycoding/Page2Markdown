<img src="assets/logo.png" width="96" alt="Page2Markdown">

# Page2Markdown

*[English](README.md)*

Chrome extension (Manifest V3) lưu trang web đang xem — hoặc đúng vùng đang bôi đen — thành file Markdown sạch, kèm YAML frontmatter để bỏ thẳng vào Obsidian.

## Flow nghiệp vụ

### Ba lối vào, cùng một đích

| Lối vào | Dùng khi |
| --- | --- |
| Bấm icon trên toolbar | Mặc định |
| `Cmd/Ctrl + Shift + M` | Không muốn rời bàn phím |
| Chuột phải → **Save Page To Markdown** | Đã bôi đen sẵn một đoạn |

Cả ba đều dẫn về **editor mở trong tab riêng**: toolbar định dạng, ô soạn Markdown, preview cạnh bên. Không còn popup — popup sống 4 giây thì không đủ chỗ để sửa gì cho tử tế.

### Đường đi của dữ liệu

```
Người dùng ra lệnh (icon / phím tắt / menu)
   │
   ├─ Chrome cấp quyền activeTab cho đúng tab đó, đúng lần đó
   ▼
service worker ── ping tab xem content script có sẵn chưa
   │                └─ chưa có → inject src/content/extractor.js
   ▼
extractor (chạy trong trang) ── chọn nguồn theo thứ tự ưu tiên:
   │   1. Vùng đang bôi đen        → lấy nguyên vùng đó
   │   2. Readability              → lọc bỏ menu, quảng cáo, sidebar
   │   3. <main>/<article>/<body>  → khi Readability không nhận ra bài viết
   │
   ├─ dọn DOM: bỏ script/style/form, đổi link và ảnh sang URL tuyệt đối,
   │            lấy URL thật của ảnh lazy-load, đóng dấu ngôn ngữ code block
   ├─ Turndown → Markdown (bảng GFM, code fence có tên ngôn ngữ, list gọn)
   ▼
service worker ── lưu draft vào storage.local, mở tab editor?draft=<id>
   ▼
editor ── frontmatter + tiêu đề + thân bài, sửa tay được
   └─ Copy hoặc Download .md → xoá draft
```

### Vì sao chọn từng bước

- **Chụp ở service worker, không phải trong editor.** Quyền `activeTab` chỉ sống trong lượt người dùng vừa ra lệnh; editor là một tab khác và không có quyền gì với trang gốc. Nên nội dung phải được chụp xong trước khi mở editor.
- **Bàn giao qua `storage.local`, không qua URL.** Một bài viết dài hơn giới hạn địa chỉ rất nhiều. Draft quá 24 giờ bị dọn tự động.
- **Inject theo yêu cầu, không khai báo content script tĩnh.** Extension chỉ xin `activeTab` nên không đọc được gì cho tới khi người dùng ra lệnh, và không tốn một byte nào trên trang không lưu.
- **Ping trước khi inject.** Clip lần hai trên cùng trang thì khỏi nạp lại bundle 52 KB.
- **Readability trước, thân trang sau.** Readability lọc rất sạch nhưng bó tay với trang không phải bài viết; lúc đó rơi về `<main>` rồi `<body>` để không bao giờ trả về file rỗng.
- **Preview chạy trong `<iframe sandbox>`.** Nội dung đến từ trang lạ, sandbox rỗng chặn mọi script — trang extension có quyền `chrome.*` nên không được phép dính XSS.
- **Sửa tiêu đề chỉ dựng lại phần đầu file.** Frontmatter và dòng H1 được thay, phần thân người dùng đã sửa tay thì giữ nguyên.

## Cài đặt

```bash
bun install
bun run build
```

Vào `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục `dist`.

Sửa code thì chạy `bun run dev` (vite build --watch) rồi bấm reload extension.

## Kiểm thử

```bash
bun run check      # typecheck + lint + unit test + build
bun run test:e2e   # mở Chrome thật, kiểm extension đã build (cần build trước)
```

- `tests/extract.test.ts` — trích xuất trên DOM thật (jsdom): metadata, code block giữ ngôn ngữ, URL tuyệt đối, bảng GFM, ảnh lazy-load, list lồng nhau, trang rỗng.
- `tests/filename.test.ts` — slug tiếng Việt, ký tự cấm, thư mục con, chặn path traversal.
- `tests/markdown.test.ts` — YAML frontmatter không vỡ vì tiêu đề có dấu nháy hay dấu hai chấm.
- `tests/markdown-commands.test.ts` — từng nút toolbar, gồm cả bấm lần hai để gỡ định dạng.
- `tests/config.test.ts` — khi nào mở welcome, gợi ý affiliate xoay theo ngày.
- `tests/e2e/` — extension load được, menu, storage, downloads, editor dựng nội dung từ draft + toolbar + preview, service worker không ném lỗi.

## Cấu trúc

```
src/
  background/service-worker.ts   icon, phím tắt, menu chuột phải, welcome
  config/index.ts                mặc định + hằng số dùng chung
  content/
    extractor.ts                 entry được inject, lắng nghe message
    extract.ts                   điều phối: chọn nguồn → dọn → Turndown
    dom-cleaner.ts               absolutize URL, lọc nhiễu, đóng dấu ngôn ngữ
    turndown-factory.ts          cấu hình Turndown + rule riêng
    page-meta.ts                 đọc metadata và vùng bôi đen
  editor/
    editor.ts                    bootstrap: đọc draft, nối các nút
    markdown-commands.ts         lệnh định dạng, thuần hàm trên chuỗi
    preview.ts                   render sang HTML cho iframe sandbox
  options/                       trang cài đặt
  services/                      settings / capture / download / draft
  types/                         kiểu dùng chung
  utils/                         tên file, frontmatter
```

## Tuỳ chọn

Bấm ⚙ góc phải editor để mở trang cài đặt.

- **Nội dung**: phạm vi (bài viết / toàn trang), xử lý ảnh (giữ / chỉ alt / bỏ), giữ hay bỏ hyperlink.
- **Frontmatter**: bật tắt, chọn từng trường (`title`, `source`, `author`, `published`, `captured`, `description`, `site`, `tags`), tags mặc định, chèn `# Tiêu đề` đầu bài.
- **File**: mẫu tên file với token `{title}` `{slug}` `{domain}` `{date}` `{time}` `{timestamp}` — dấu `/` tạo thư mục con; thư mục đích trong Downloads; hỏi chỗ lưu mỗi lần.
- **Kiểu Markdown**: heading ATX/Setext, ký hiệu bullet, code block fenced/indented.

Trong editor, đổi **phạm vi** hay **ảnh** chỉ có tác dụng cho lần clip sau — hai thứ đó quyết định lúc chuyển HTML sang Markdown, mà việc đó đã xong trước khi tab editor mở.

## Kiếm tiền

- `WELCOME_URL` trong `src/config/index.ts` — trang chào mừng nằm trên web của mình, mở khi cài mới và khi lên minor/major. Để rỗng thì không mở tab nào. Đặt trên web chứ không phải trang extension để sửa nội dung mà không phải nộp lại bản build.
- `AFFILIATE_LINKS` — một dòng gợi ý duy nhất ở chân editor, xoay theo ngày. Chỉ là link tĩnh: không script, không tracker, nên không đụng CSP của MV3 và giữ nguyên được lời hứa "no tracking" trên store.

## Nộp Chrome Web Store

```bash
bun run package   # build + đóng gói store/page2markdown-<version>.zip
```

- `store/LISTING.md` — toàn bộ text cần dán vào Developer Dashboard, kèm giải trình từng permission.
- `store/screenshots/` — 3 ảnh 1280×800 đúng chuẩn listing.
- `store/privacy-policy.html` — trang chính sách, cần đưa lên một URL public rồi dán vào ô Privacy policy.

Giao diện extension dùng tiếng Anh; tài liệu trong repo giữ tiếng Việt.

## Giấy phép

[MIT](LICENSE).

Dựng trên [@mozilla/readability](https://github.com/mozilla/readability), [Turndown](https://github.com/mixmark-io/turndown) và [marked](https://github.com/markedjs/marked).

## Giới hạn đã biết

- **Trang hệ thống bị chặn**: `chrome://`, Chrome Web Store, trang PDF. Extension báo lỗi rõ chứ không lưu file rỗng.
- **Nội dung lazy-load**: chỉ lấy được phần đã render tại thời điểm lưu. Trang cuộn vô hạn cần cuộn tay trước khi lưu.
- **Ảnh chỉ được tham chiếu bằng URL**, không tải về kèm. Ảnh sau login hoặc chặn hotlink sẽ hỏng khi xem offline.
- **`file://`** cần bật thủ công "Allow access to file URLs" trong trang quản lý extension.
