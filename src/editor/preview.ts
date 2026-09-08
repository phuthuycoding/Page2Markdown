import { marked } from 'marked';

const PREVIEW_STYLE = `
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 18px 22px;
    font: 15px/1.65 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #22242e; background: #fff; word-wrap: break-word;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #eceef5; background: #22242e; }
    code, pre { background: #2c3040 !important; }
    th, td, hr, blockquote { border-color: #3d4356 !important; }
  }
  h1, h2, h3 { line-height: 1.3; margin: 1.4em 0 0.5em; }
  h1 { font-size: 1.7em; } h2 { font-size: 1.35em; } h3 { font-size: 1.12em; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
  a { color: #6d3fe8; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  code { background: #f5f6fa; border-radius: 4px; padding: 2px 5px; font-size: 0.88em;
         font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { background: #f5f6fa; border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #e1e4ed; margin-left: 0; padding-left: 14px; color: #6b7186; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e1e4ed; padding: 7px 11px; text-align: left; }
  hr { border: none; border-top: 1px solid #e1e4ed; }
`;

/** Tách frontmatter ra để preview hiện nó như một khối, không phải một đống chữ. */
function splitFrontmatter(markdown: string): { frontmatter: string; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: '', body: markdown };
  return { frontmatter: match[1] ?? '', body: markdown.slice(match[0].length) };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Trả về HTML hoàn chỉnh để nhét vào srcdoc của iframe sandbox. Nội dung đến từ
 * trang lạ nên chỉ được render trong sandbox rỗng — không script, không form,
 * không chạm được vào trang extension.
 */
export function renderPreview(markdown: string): string {
  const { frontmatter, body } = splitFrontmatter(markdown);
  const meta = frontmatter
    ? `<pre style="font-size:12px;color:#6b7186">${escapeHtml(frontmatter)}</pre><hr>`
    : '';
  const html = marked.parse(body, { async: false, gfm: true, breaks: false });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_STYLE}</style></head><body>${meta}${html}</body></html>`;
}
