import { Readability } from '@mozilla/readability';
import { READABILITY_MIN_CHARS } from '../config';
import {
  absolutizeUrls,
  applyContentPolicy,
  stampCodeLanguages,
  toDetachedDocument,
} from './dom-cleaner';
import { getSelectionHtml, readPageMeta } from './page-meta';
import { createTurndownService } from './turndown-factory';
import type { CapturePayload, CaptureSource, CaptureStats } from '../types/capture';
import type { ExtractOptions } from '../types/settings';

type Article = ReturnType<Readability['parse']>;

/** Chạy Readability trên bản clone: nó sửa trực tiếp document được truyền vào. */
function extractArticle(): Article {
  const clone = document.cloneNode(true) as Document;
  stampCodeLanguages(clone);

  const article = new Readability(clone, { charThreshold: READABILITY_MIN_CHARS }).parse();
  if (!article || article.textContent.trim().length < READABILITY_MIN_CHARS) return null;
  return article;
}

function buildStats(root: HTMLElement, markdown: string): CaptureStats {
  return {
    words: markdown.trim().split(/\s+/).filter(Boolean).length,
    images: root.querySelectorAll('img').length,
    links: root.querySelectorAll('a[href]').length,
    chars: markdown.length,
  };
}

/** Chọn nguồn HTML theo thứ tự: vùng bôi đen → Readability → thân trang. */
function pickSource(options: ExtractOptions): { html: string; source: CaptureSource; article: Article } {
  const selection = getSelectionHtml();
  if (selection) return { html: selection, source: 'selection', article: null };

  if (options.contentMode === 'article') {
    const article = extractArticle();
    if (article) return { html: article.content, source: 'readability', article };
  }

  const container = document.querySelector('main, article') ?? document.body;
  return { html: container.innerHTML, source: 'body', article: null };
}

export class EmptyContentError extends Error {
  constructor() {
    super('No readable text could be extracted from this page.');
    this.name = 'EmptyContentError';
  }
}

export function extractMarkdown(options: ExtractOptions): CapturePayload {
  const pageMeta = readPageMeta();
  const { html, source, article } = pickSource(options);

  const doc = toDetachedDocument(html, document.baseURI);
  absolutizeUrls(doc.body, document.baseURI);
  applyContentPolicy(doc.body, options);

  const markdown = createTurndownService(options).turndown(doc.body.innerHTML);
  if (markdown.trim().length === 0) throw new EmptyContentError();

  return {
    source,
    meta: {
      ...pageMeta,
      title: article?.title || pageMeta.title,
      author: article?.byline || pageMeta.author,
      excerpt: article?.excerpt || pageMeta.excerpt,
      siteName: article?.siteName || pageMeta.siteName,
      publishedTime: article?.publishedTime || pageMeta.publishedTime,
    },
    markdown,
    stats: buildStats(doc.body, markdown),
  };
}
