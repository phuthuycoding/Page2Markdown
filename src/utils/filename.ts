import type { PageMeta } from '../types/capture';

const MAX_SLUG_LENGTH = 80;
const MAX_SEGMENT_LENGTH = 150;

/** Bỏ dấu tiếng Việt và ký tự lạ để tên file an toàn trên mọi hệ điều hành. */
export function slugify(text: string, maxLength: number = MAX_SLUG_LENGTH): string {
  const base = (text || '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, maxLength).replace(/-+$/, '') || 'untitled';
}

/** Loại ký tự Chrome Downloads từ chối trong một đoạn đường dẫn. */
export function sanitizeSegment(name: string): string {
  return (
    name
      // Control character trong tên file khiến chrome.downloads từ chối cả lượt
      // tải, nên bắt chúng ở đây là có chủ đích.
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, MAX_SEGMENT_LENGTH) || 'untitled'
  );
}

/**
 * Dựng tên file từ template. Dấu "/" trong template được giữ để tạo thư mục con
 * (ví dụ "{domain}/{slug}"), nhưng từng đoạn vẫn bị sanitize nên "../" không
 * thoát ra ngoài thư mục Downloads được.
 */
export function buildFilename(template: string, meta: PageMeta, now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const tokens: Record<string, string> = {
    '{title}': sanitizeSegment(meta.title || 'untitled'),
    '{slug}': slugify(meta.title),
    '{domain}': (meta.domain || 'unknown').replace(/^www\./, ''),
    '{date}': `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    '{time}': `${pad(now.getHours())}${pad(now.getMinutes())}`,
    '{timestamp}': String(Math.floor(now.getTime() / 1000)),
  };

  const filled = Object.entries(tokens).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template || '{date}-{slug}'
  );

  const segments = filled
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^\.+$/.test(part))
    .map(sanitizeSegment);

  return `${segments.length > 0 ? segments.join('/') : 'untitled'}.md`;
}

/** Ghép thư mục đích của người dùng vào trước tên file. */
export function withDownloadFolder(filename: string, folder: string): string {
  const cleaned = folder
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^\.+$/.test(part))
    .map(sanitizeSegment);
  return cleaned.length > 0 ? `${cleaned.join('/')}/${filename}` : filename;
}
