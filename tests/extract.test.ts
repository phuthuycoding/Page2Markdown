import { afterEach, describe, expect, it } from 'bun:test';
import { extractMarkdown } from '../src/content/extract';
import { mountDom } from './dom-harness';
import type { ExtractOptions } from '../src/types/settings';

const BASE_OPTIONS: ExtractOptions = {
  contentMode: 'article',
  imageMode: 'keep',
  includeLinks: true,
  headingStyle: 'atx',
  bulletMarker: '-',
  codeBlockStyle: 'fenced',
};

const PAGE_URL = 'https://blog.example.vn/bai-viet/huong-dan';

/** Readability bỏ qua khối quá ngắn, nên bài mẫu phải đủ dài mới đi đúng nhánh. */
const LONG_PARAGRAPH =
  'Đoạn văn đủ dài để Readability công nhận đây là phần thân chính của trang, ' +
  'cần khá nhiều ký tự nên phải viết dài dòng như thế này mới vượt được ngưỡng tối thiểu. ';

const ARTICLE_PAGE = `<!DOCTYPE html><html><head>
<title>Tiêu đề thẻ title</title>
<meta property="og:title" content="Hướng dẫn chuyển trang sang Markdown">
<meta name="author" content="Trần Minh Quyền">
<meta property="article:published_time" content="2026-01-15T08:00:00Z">
<meta name="description" content="Mô tả trang.">
<meta property="og:site_name" content="Blog Ví Dụ">
</head><body>
<nav><a href="/home">Menu điều hướng</a></nav>
<article>
  <h1>Hướng dẫn chuyển trang sang Markdown</h1>
  <p>${LONG_PARAGRAPH}</p>
  <h2>Cài đặt</h2>
  <p>Xem <a href="/docs/cai-dat">tài liệu</a> và <a href="https://ngoai.vn/x">link ngoài</a>. ${LONG_PARAGRAPH}</p>
  <pre><code class="language-python">print("xin chào")</code></pre>
  <table>
    <thead><tr><th>Thư viện</th><th>Vai trò</th></tr></thead>
    <tbody><tr><td>Turndown</td><td>HTML sang Markdown</td></tr></tbody>
  </table>
  <figure>
    <img src="/anh/minh-hoa.png" alt="Ảnh minh hoạ">
    <figcaption>Sơ đồ luồng xử lý</figcaption>
  </figure>
  <ul>
    <li>Mục một</li>
    <li>Mục hai
      <ul><li>Mục con A</li></ul>
    </li>
  </ul>
  <ol><li>Bước một</li><li>Bước hai<ol><li>Bước hai chấm một</li></ol></li></ol>
  <p>${LONG_PARAGRAPH}</p>
</article>
<footer><p>Chân trang</p></footer>
<script>console.log('phải bị loại');</script>
</body></html>`;

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
});

function extract(html: string, options: Partial<ExtractOptions> = {}, url = PAGE_URL) {
  unmount = mountDom(html, url);
  return extractMarkdown({ ...BASE_OPTIONS, ...options });
}

describe('extractMarkdown — bài viết chuẩn', () => {
  it('nhận đúng nguồn và metadata của trang', () => {
    const result = extract(ARTICLE_PAGE);

    expect(result.source).toBe('readability');
    expect(result.meta.title).toBe('Hướng dẫn chuyển trang sang Markdown');
    expect(result.meta.author).toBe('Trần Minh Quyền');
    expect(result.meta.publishedTime).toBe('2026-01-15T08:00:00Z');
    expect(result.meta.siteName).toBe('Blog Ví Dụ');
    expect(result.meta.url).toBe(PAGE_URL);
    expect(result.meta.domain).toBe('blog.example.vn');
  });

  it('loại nav, footer và script khỏi nội dung', () => {
    const { markdown } = extract(ARTICLE_PAGE);

    expect(markdown).not.toContain('Menu điều hướng');
    expect(markdown).not.toContain('Chân trang');
    expect(markdown).not.toContain('console.log');
  });

  it('giữ tên ngôn ngữ của code block dù Readability đã xoá class', () => {
    expect(extract(ARTICLE_PAGE).markdown).toContain('```python\nprint("xin chào")\n```');
  });

  it('đổi link và ảnh tương đối sang URL tuyệt đối', () => {
    const { markdown } = extract(ARTICLE_PAGE);

    expect(markdown).toContain('[tài liệu](https://blog.example.vn/docs/cai-dat)');
    expect(markdown).toContain('![Ảnh minh hoạ](https://blog.example.vn/anh/minh-hoa.png)');
    expect(markdown).toContain('[link ngoài](https://ngoai.vn/x)');
  });

  it('chuyển bảng sang cú pháp GFM', () => {
    const { markdown } = extract(ARTICLE_PAGE);

    expect(markdown).toContain('| Thư viện | Vai trò |');
    expect(markdown).toContain('| Turndown | HTML sang Markdown |');
  });

  it('figcaption thành dòng chú thích in nghiêng', () => {
    expect(extract(ARTICLE_PAGE).markdown).toContain('_Sơ đồ luồng xử lý_');
  });

  it('bullet gọn "- " và list lồng thụt đúng độ dài prefix', () => {
    const { markdown } = extract(ARTICLE_PAGE);

    expect(markdown).toContain('- Mục một');
    expect(markdown).not.toContain('-   Mục một');
    expect(markdown).toContain('\n  - Mục con A');
    // "1. " dài 3 ký tự nên mục con phải thụt 3 cột, thụt 2 là CommonMark hiểu sai cấp.
    expect(markdown).toContain('\n   1. Bước hai chấm một');
  });

  it('đếm được số từ, ảnh và link', () => {
    const { stats } = extract(ARTICLE_PAGE);

    expect(stats.images).toBe(1);
    expect(stats.links).toBe(2);
    expect(stats.words).toBeGreaterThan(50);
  });
});

describe('extractMarkdown — theo tuỳ chọn người dùng', () => {
  it('imageMode=strip bỏ hẳn ảnh', () => {
    expect(extract(ARTICLE_PAGE, { imageMode: 'strip' }).markdown).not.toContain('![');
  });

  it('imageMode=alt giữ chữ alt nhưng bỏ cú pháp ảnh', () => {
    const { markdown } = extract(ARTICLE_PAGE, { imageMode: 'alt' });

    expect(markdown).not.toContain('![');
    expect(markdown).toContain('Ảnh minh hoạ');
  });

  it('includeLinks=false giữ chữ, bỏ URL', () => {
    const { markdown } = extract(ARTICLE_PAGE, { includeLinks: false });

    expect(markdown).not.toContain('](https://blog.example.vn/docs/cai-dat)');
    expect(markdown).toContain('tài liệu');
  });

  it('contentMode=full lấy toàn trang nhưng vẫn loại nav/footer', () => {
    const result = extract(ARTICLE_PAGE, { contentMode: 'full' });

    expect(result.source).toBe('body');
    expect(result.markdown).not.toContain('Menu điều hướng');
    expect(result.markdown).not.toContain('Chân trang');
  });

  it('codeBlockStyle=indented thụt code 4 dấu cách thay vì fence', () => {
    const { markdown } = extract(ARTICLE_PAGE, { codeBlockStyle: 'indented' });

    expect(markdown).not.toContain('```');
    expect(markdown).toContain('    print("xin chào")');
  });

  it('bulletMarker đổi được ký hiệu đầu dòng', () => {
    expect(extract(ARTICLE_PAGE, { bulletMarker: '*' }).markdown).toContain('* Mục một');
  });
});

describe('extractMarkdown — trang khó', () => {
  it('trang quá mỏng thì rơi về thân trang thay vì báo lỗi', () => {
    const result = extract(
      `<!DOCTYPE html><html><head><title>Mỏng</title></head><body><div><p>Ngắn thôi.</p></div></body></html>`
    );

    expect(result.source).toBe('body');
    expect(result.markdown).toContain('Ngắn thôi');
  });

  it('trang không có chữ nào thì báo lỗi rõ ràng, không trả file rỗng', () => {
    expect(() =>
      extract(`<!DOCTYPE html><html><head><title>Rỗng</title></head><body></body></html>`)
    ).toThrow('No readable text could be extracted from this page.');
  });

  it('ảnh lazy-load lấy URL thật từ data-src thay vì ảnh giữ chỗ', () => {
    const lazyPage = `<!DOCTYPE html><html><body><article><h1>T</h1><p>${LONG_PARAGRAPH}</p>
      <img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
           data-src="/anh/that.jpg" alt="lazy">
      <p>${LONG_PARAGRAPH}</p></article></body></html>`;

    expect(extract(lazyPage).markdown).toContain('https://blog.example.vn/anh/that.jpg');
  });

  it('code chứa dấu ``` được bọc bằng fence dài hơn để không đứt sớm', () => {
    const nestedFence = `<!DOCTYPE html><html><body><article><h1>T</h1><p>${LONG_PARAGRAPH}</p>
      <pre><code>viết \`\`\` trong code</code></pre>
      <p>${LONG_PARAGRAPH}</p></article></body></html>`;

    expect(extract(nestedFence).markdown).toContain('````\nviết ``` trong code\n````');
  });

  it('không có og:title thì dùng thẻ title của trang', () => {
    const noOg = `<!DOCTYPE html><html><head><title>Chỉ có title</title></head>
      <body><article><h1>H1</h1><p>${LONG_PARAGRAPH}</p><p>${LONG_PARAGRAPH}</p></article></body></html>`;

    expect(extract(noOg).meta.title).toBe('Chỉ có title');
  });
});
