import {
  CODE_LANG_ATTR,
  LAYOUT_NOISE_SELECTOR,
  LAZY_IMAGE_ATTRS,
  NOISE_SELECTOR,
} from '../config';
import type { ExtractOptions } from '../types/settings';

/** Ảnh lazy-load hay đặt một GIF trong suốt ở src rồi mới nạp ảnh thật sau. */
function isPlaceholder(src: string | null): boolean {
  return !src || src.startsWith('data:image/gif');
}

/**
 * Document rời có <base>: URL tương đối vẫn resolve đúng, mà vì nó không gắn
 * vào browsing context nào nên gán innerHTML không kích hoạt tải ảnh của trang.
 */
export function toDetachedDocument(html: string, baseUri: string): Document {
  const doc = document.implementation.createHTMLDocument('');
  const base = doc.createElement('base');
  base.href = baseUri;
  doc.head.appendChild(base);
  doc.body.innerHTML = html;
  return doc;
}

/** Đổi mọi href/src sang URL tuyệt đối để file Markdown còn dùng được khi rời trang. */
export function absolutizeUrls(root: HTMLElement, baseUri: string): void {
  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (!href) continue;
    try {
      anchor.setAttribute('href', new URL(href, baseUri).href);
    } catch {
      anchor.removeAttribute('href');
    }
  }

  for (const image of root.querySelectorAll('img')) {
    let src = image.getAttribute('src');

    if (isPlaceholder(src)) {
      const lazy = LAZY_IMAGE_ATTRS.map((attr) => image.getAttribute(attr)).find(Boolean);
      if (lazy) src = lazy;
    }
    if (isPlaceholder(src)) {
      const srcset = image.getAttribute('srcset');
      const first = srcset?.split(',')[0]?.trim().split(/\s+/)[0];
      if (first) src = first;
    }
    if (!src) {
      image.remove();
      continue;
    }

    try {
      image.setAttribute('src', new URL(src, baseUri).href);
    } catch {
      image.remove();
    }
  }
}

/** Áp dụng lựa chọn của người dùng về nhiễu, ảnh và link. */
export function applyContentPolicy(root: HTMLElement, options: ExtractOptions): void {
  for (const node of root.querySelectorAll(NOISE_SELECTOR)) node.remove();

  if (options.contentMode === 'full') {
    for (const node of root.querySelectorAll(LAYOUT_NOISE_SELECTOR)) node.remove();
  }

  if (options.imageMode === 'strip') {
    for (const node of root.querySelectorAll('img, picture, figcaption')) node.remove();
  } else if (options.imageMode === 'alt') {
    for (const image of root.querySelectorAll('img')) {
      const alt = image.getAttribute('alt') ?? '';
      image.replaceWith(root.ownerDocument.createTextNode(alt));
    }
  }

  if (!options.includeLinks) {
    for (const anchor of root.querySelectorAll('a[href]')) {
      anchor.replaceWith(...Array.from(anchor.childNodes));
    }
  }
}

/** Đọc tên ngôn ngữ của một khối code từ class hoặc dấu đã đóng trước đó. */
export function detectLanguage(pre: Element | null, code: Element | null): string {
  const stamped = pre?.getAttribute(CODE_LANG_ATTR);
  if (stamped) return stamped;

  const classes = `${code?.className ?? ''} ${pre?.className ?? ''}`;
  const match = classes.match(/(?:language|lang|highlight-source|brush:)[-\s:]([a-z0-9+#]+)/i);
  if (match?.[1]) return match[1].toLowerCase();

  return pre?.getAttribute('data-lang') ?? code?.getAttribute('data-lang') ?? '';
}

/** Đóng dấu ngôn ngữ vào data-* để nó sống sót qua bước dọn class của Readability. */
export function stampCodeLanguages(doc: Document): void {
  for (const pre of doc.querySelectorAll('pre')) {
    const language = detectLanguage(pre, pre.querySelector('code'));
    if (language) pre.setAttribute(CODE_LANG_ATTR, language);
  }
}
