import type { PageMeta } from '../types/capture';

/** Lấy giá trị đầu tiên tìm được trong danh sách selector metadata. */
function metaContent(...selectors: string[]): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const value =
      element.getAttribute('content') ?? element.getAttribute('datetime') ?? element.textContent;
    if (value && value.trim().length > 0) return value.trim();
  }
  return '';
}

export function readPageMeta(): PageMeta {
  return {
    url: location.href,
    domain: location.hostname,
    title: metaContent('meta[property="og:title"]', 'meta[name="twitter:title"]') || document.title,
    author: metaContent(
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="byl"]',
      '[rel="author"]'
    ),
    publishedTime: metaContent(
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[itemprop="datePublished"]',
      'time[datetime]'
    ),
    excerpt: metaContent('meta[name="description"]', 'meta[property="og:description"]'),
    siteName: metaContent('meta[property="og:site_name"]') || location.hostname,
  };
}

/** HTML của vùng người dùng đang bôi đen, rỗng nếu không chọn gì. */
export function getSelectionHtml(): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return '';

  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i += 1) {
    container.appendChild(selection.getRangeAt(i).cloneContents());
  }
  return container.innerHTML.trim();
}
