/** Nguồn nội dung mà extractor thực sự dùng được. */
export type CaptureSource = 'selection' | 'readability' | 'body';

export interface PageMeta {
  url: string;
  domain: string;
  title: string;
  author: string;
  publishedTime: string;
  excerpt: string;
  siteName: string;
}

export interface CaptureStats {
  words: number;
  images: number;
  links: number;
  chars: number;
}

export interface CapturePayload {
  source: CaptureSource;
  meta: PageMeta;
  markdown: string;
  stats: CaptureStats;
}

export type ExtractResponse =
  | { ok: true; payload: CapturePayload }
  | { ok: false; error: string };

export interface DownloadResult {
  downloadId: number;
  filename: string;
  bytes: number;
}
