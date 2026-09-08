import { describe, expect, it } from 'bun:test';
import { DEFAULT_SETTINGS } from '../src/config';
import { buildFrontmatter, composeDocument } from '../src/utils/markdown';
import type { CapturePayload, PageMeta } from '../src/types/capture';
import type { Settings } from '../src/types/settings';

const META: PageMeta = {
  url: 'https://blog.example.vn/bai-viet',
  domain: 'blog.example.vn',
  title: 'Tiêu đề: có "dấu nháy" và dấu hai chấm',
  author: 'Trần Minh Quyền',
  publishedTime: '2026-01-15T08:00:00Z',
  excerpt: 'Mô tả ngắn của bài.',
  siteName: 'Blog Ví Dụ',
};

const CAPTURED_AT = new Date('2026-03-04T03:20:30.000Z');

function settingsWith(overrides: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function payload(markdown: string): CapturePayload {
  return {
    source: 'readability',
    meta: META,
    markdown,
    stats: { words: 0, images: 0, links: 0, chars: markdown.length },
  };
}

describe('buildFrontmatter — YAML không được vỡ vì tiêu đề', () => {
  it('quote và escape dấu nháy kép, giữ nguyên dấu hai chấm', () => {
    const yaml = buildFrontmatter(
      META,
      settingsWith({ frontmatterFields: ['title'] }),
      CAPTURED_AT
    );
    expect(yaml).toBe('---\ntitle: "Tiêu đề: có \\"dấu nháy\\" và dấu hai chấm"\n---\n\n');
  });

  it('chỉ in đúng những trường được chọn, đúng thứ tự khai báo', () => {
    const yaml = buildFrontmatter(
      META,
      settingsWith({ frontmatterFields: ['source', 'author', 'captured'] }),
      CAPTURED_AT
    );
    expect(yaml).toBe(
      '---\n' +
        'source: "https://blog.example.vn/bai-viet"\n' +
        'author: "Trần Minh Quyền"\n' +
        'captured: "2026-03-04T03:20:30.000Z"\n' +
        '---\n\n'
    );
  });

  it('bỏ qua trường không có dữ liệu thay vì in giá trị rỗng', () => {
    const thin: PageMeta = { ...META, author: '', excerpt: '' };
    const yaml = buildFrontmatter(
      thin,
      settingsWith({ frontmatterFields: ['author', 'description', 'site'] }),
      CAPTURED_AT
    );
    expect(yaml).toBe('---\nsite: "Blog Ví Dụ"\n---\n\n');
  });

  it('tags in dạng mảng inline, bỏ tag rỗng', () => {
    const yaml = buildFrontmatter(
      META,
      settingsWith({ frontmatterFields: ['tags'], defaultTags: ['clip', '', 'web'] }),
      CAPTURED_AT
    );
    expect(yaml).toBe('---\ntags: ["clip", "web"]\n---\n\n');
  });

  it('tắt frontmatter thì không sinh gì', () => {
    expect(buildFrontmatter(META, settingsWith({ includeFrontmatter: false }), CAPTURED_AT)).toBe(
      ''
    );
  });

  it('chọn toàn trường rỗng thì không để lại khối "---" trống', () => {
    const empty: PageMeta = { ...META, author: '', excerpt: '' };
    expect(
      buildFrontmatter(
        empty,
        settingsWith({ frontmatterFields: ['author', 'description'] }),
        CAPTURED_AT
      )
    ).toBe('');
  });
});

describe('composeDocument — ghép file hoàn chỉnh', () => {
  it('frontmatter + H1 + thân bài, kết thúc bằng đúng một newline', () => {
    const doc = composeDocument(
      payload('## Phần một\n\nNội dung'),
      settingsWith({ frontmatterFields: ['title'], includeTitleHeading: true }),
      CAPTURED_AT
    );
    expect(doc).toBe(
      '---\ntitle: "Tiêu đề: có \\"dấu nháy\\" và dấu hai chấm"\n---\n\n' +
        '# Tiêu đề: có "dấu nháy" và dấu hai chấm\n\n' +
        '## Phần một\n\nNội dung\n'
    );
  });

  it('tắt cả frontmatter lẫn H1 thì chỉ còn thân bài', () => {
    const doc = composeDocument(
      payload('Chỉ có nội dung'),
      settingsWith({ includeFrontmatter: false, includeTitleHeading: false }),
      CAPTURED_AT
    );
    expect(doc).toBe('Chỉ có nội dung\n');
  });

  it('cắt khoảng trắng thừa quanh thân bài', () => {
    const doc = composeDocument(
      payload('\n\n\nNội dung\n\n\n'),
      settingsWith({ includeFrontmatter: false, includeTitleHeading: false }),
      CAPTURED_AT
    );
    expect(doc).toBe('Nội dung\n');
  });
});
