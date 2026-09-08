import { JSDOM } from 'jsdom';

const GLOBAL_KEYS = [
  'window',
  'document',
  'location',
  'navigator',
  'Node',
  'Element',
  'HTMLElement',
  'DOMParser',
  'NodeFilter',
  'getSelection',
] as const;

/**
 * Readability và Turndown đều làm việc trực tiếp với DOM toàn cục, nên test phải
 * dựng một document thật rồi gán vào globalThis trước khi gọi code trích xuất.
 */
export function mountDom(html: string, url: string): () => void {
  const dom = new JSDOM(html, { url });
  const store = globalThis as unknown as Record<string, unknown>;
  const saved = new Map<string, unknown>();

  for (const key of GLOBAL_KEYS) {
    saved.set(key, store[key]);
    const value = (dom.window as unknown as Record<string, unknown>)[key];
    store[key] = typeof value === 'function' ? value.bind(dom.window) : value;
  }

  return () => {
    for (const [key, value] of saved) store[key] = value;
    dom.window.close();
  };
}
