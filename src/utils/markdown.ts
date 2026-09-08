import type { CapturePayload, PageMeta } from '../types/capture';
import type { FrontmatterField, Settings } from '../types/settings';

/**
 * Luôn quote kép thay vì đoán trường hợp nào cần: tiêu đề chứa ": ", "#" hay
 * "[" đều phá vỡ YAML nếu để trần, mà tiêu đề bài báo thì đầy những thứ đó.
 */
function yamlString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
  return `"${escaped}"`;
}

function yamlList(values: string[]): string {
  return values.length > 0 ? `[${values.map(yamlString).join(', ')}]` : '[]';
}

function frontmatterLine(
  field: FrontmatterField,
  meta: PageMeta,
  tags: string[],
  capturedAt: Date
): string | null {
  switch (field) {
    case 'title':
      return meta.title ? `title: ${yamlString(meta.title)}` : null;
    case 'source':
      return meta.url ? `source: ${yamlString(meta.url)}` : null;
    case 'author':
      return meta.author ? `author: ${yamlString(meta.author)}` : null;
    case 'published':
      return meta.publishedTime ? `published: ${yamlString(meta.publishedTime)}` : null;
    case 'captured':
      return `captured: ${yamlString(capturedAt.toISOString())}`;
    case 'description':
      return meta.excerpt ? `description: ${yamlString(meta.excerpt)}` : null;
    case 'site':
      return meta.siteName ? `site: ${yamlString(meta.siteName)}` : null;
    case 'tags':
      return tags.length > 0 ? `tags: ${yamlList(tags)}` : null;
  }
}

export function buildFrontmatter(
  meta: PageMeta,
  settings: Settings,
  capturedAt: Date = new Date()
): string {
  if (!settings.includeFrontmatter) return '';

  const tags = settings.defaultTags.filter((tag) => tag.length > 0);
  const lines = settings.frontmatterFields
    .map((field) => frontmatterLine(field, meta, tags, capturedAt))
    .filter((line): line is string => line !== null);

  return lines.length > 0 ? `---\n${lines.join('\n')}\n---\n\n` : '';
}

/** Ghép frontmatter + tiêu đề + thân bài thành nội dung file cuối cùng. */
export function composeDocument(
  payload: CapturePayload,
  settings: Settings,
  capturedAt: Date = new Date()
): string {
  // Readability hạ H1 của bài xuống H2, nên tắt cả frontmatter lẫn tuỳ chọn này
  // là file Markdown mất sạch tiêu đề.
  const heading =
    settings.includeTitleHeading && payload.meta.title ? `# ${payload.meta.title}\n\n` : '';

  return buildFrontmatter(payload.meta, settings, capturedAt) + heading + payload.markdown.trim() + '\n';
}
