import { describe, expect, it } from 'bun:test';
import { buildFilename, sanitizeSegment, slugify, withDownloadFolder } from '../src/utils/filename';
import type { PageMeta } from '../src/types/capture';

const META: PageMeta = {
  url: 'https://blog.example.vn/bai-viet',
  domain: 'www.blog.example.vn',
  title: 'Hướng dẫn: "Turndown" & Đường tới Sài Gòn',
  author: '',
  publishedTime: '',
  excerpt: '',
  siteName: '',
};

const NOW = new Date('2026-03-04T10:20:30');

describe('slugify — tên file không dấu, an toàn mọi OS', () => {
  it('bỏ dấu tiếng Việt, đ thành d', () => {
    expect(slugify('Đường đến Sài Gòn')).toBe('duong-den-sai-gon');
  });

  it('gộp ký tự lạ thành một gạch nối, không để gạch thừa hai đầu', () => {
    expect(slugify('  Xin — chào!!  Thế giới  ')).toBe('xin-chao-the-gioi');
  });

  it('chuỗi rỗng hoặc toàn ký tự lạ vẫn ra tên dùng được', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('!!! ???')).toBe('untitled');
  });

  it('cắt theo maxLength và không để lại gạch nối cuối', () => {
    expect(slugify('aaa bbb ccc ddd', 8)).toBe('aaa-bbb');
  });
});

describe('sanitizeSegment — loại ký tự Chrome Downloads từ chối', () => {
  it('thay ký tự cấm bằng gạch nối', () => {
    expect(sanitizeSegment('a<b>c:d"e/f\\g|h?i*j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('bỏ dấu chấm ở hai đầu để không tạo file ẩn hay tên rỗng', () => {
    expect(sanitizeSegment('...tên...')).toBe('tên');
  });
});

describe('buildFilename — dựng tên file từ template', () => {
  it('thay token date và slug', () => {
    expect(buildFilename('{date}-{slug}', META, NOW)).toBe(
      '2026-03-04-huong-dan-turndown-duong-toi-sai-gon.md'
    );
  });

  it('bỏ tiền tố www của domain', () => {
    expect(buildFilename('{domain}', META, NOW)).toBe('blog.example.vn.md');
  });

  it('token time và timestamp', () => {
    expect(buildFilename('{time}', META, NOW)).toBe('1020.md');
    expect(buildFilename('{timestamp}', META, NOW)).toBe(`${Math.floor(NOW.getTime() / 1000)}.md`);
  });

  it('dấu / trong template tạo thư mục con', () => {
    expect(buildFilename('{domain}/{slug}', META, NOW)).toBe(
      'blog.example.vn/huong-dan-turndown-duong-toi-sai-gon.md'
    );
  });

  it('chặn path traversal: ".." không thoát khỏi thư mục Downloads', () => {
    expect(buildFilename('../../{slug}', META, NOW)).toBe(
      'huong-dan-turndown-duong-toi-sai-gon.md'
    );
  });

  it('template rỗng rơi về mặc định', () => {
    expect(buildFilename('', META, NOW)).toBe('2026-03-04-huong-dan-turndown-duong-toi-sai-gon.md');
  });
});

describe('withDownloadFolder — ghép thư mục đích', () => {
  it('ghép thư mục vào trước tên file', () => {
    expect(withDownloadFolder('bai.md', 'Page2Markdown')).toBe('Page2Markdown/bai.md');
  });

  it('thư mục rỗng thì giữ nguyên tên file', () => {
    expect(withDownloadFolder('bai.md', '')).toBe('bai.md');
  });

  it('thư mục nhiều cấp và có dấu / thừa vẫn sạch', () => {
    expect(withDownloadFolder('bai.md', '/Clip/Web/')).toBe('Clip/Web/bai.md');
  });

  it('chặn traversal trong tên thư mục', () => {
    expect(withDownloadFolder('bai.md', '../..')).toBe('bai.md');
  });
});
