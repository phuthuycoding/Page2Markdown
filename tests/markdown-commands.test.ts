import { describe, expect, it } from 'bun:test';
import { applyCommand, type CommandName } from '../src/editor/markdown-commands';

/**
 * Ký hiệu trong chuỗi mong đợi: "|" là con trỏ, "[...]" là vùng đang bôi đen.
 * Viết vậy để đọc test là thấy ngay con trỏ nhảy đi đâu sau khi bấm nút.
 */
function run(command: CommandName, input: string): string {
  const start = input.indexOf('[');
  const end = input.indexOf(']');
  const value = input.replace('[', '').replace(']', '');
  const selection =
    start === -1
      ? { text: '', start: input.indexOf('|'), end: input.indexOf('|') }
      : { text: value.slice(start, end - 1), start, end: end - 1 };

  const result = applyCommand(command, value, selection);
  return (
    result.text.slice(0, result.selectionStart) +
    '[' +
    result.text.slice(result.selectionStart, result.selectionEnd) +
    ']' +
    result.text.slice(result.selectionEnd)
  );
}

describe('applyCommand — bọc cặp dấu', () => {
  it('bold bọc vùng chọn và giữ nguyên vùng đó', () => {
    expect(run('bold', 'xin [chào] bạn')).toBe('xin **[chào]** bạn');
  });

  it('bấm bold lần nữa thì gỡ dấu ra', () => {
    expect(run('bold', 'xin **[chào]** bạn')).toBe('xin [chào] bạn');
  });

  it('italic dùng dấu gạch dưới', () => {
    expect(run('italic', '[chữ nghiêng]')).toBe('_[chữ nghiêng]_');
  });

  it('strikethrough dùng hai dấu ngã', () => {
    expect(run('strikethrough', '[bỏ]')).toBe('~~[bỏ]~~');
  });

  it('code dùng một backtick', () => {
    expect(run('code', 'gọi [fetch] đi')).toBe('gọi `[fetch]` đi');
  });
});

describe('applyCommand — tiền tố theo dòng', () => {
  it('heading thêm "## " vào đầu dòng', () => {
    expect(run('heading', '[Tiêu đề]')).toBe('[## Tiêu đề]');
  });

  it('bấm heading lần nữa thì gỡ tiền tố', () => {
    expect(run('heading', '[## Tiêu đề]')).toBe('[Tiêu đề]');
  });

  it('bullet list áp cho mọi dòng trong vùng chọn', () => {
    expect(run('bulletList', '[một\nhai\nba]')).toBe('[- một\n- hai\n- ba]');
  });

  it('ordered list đánh số tăng dần', () => {
    expect(run('orderedList', '[một\nhai\nba]')).toBe('[1. một\n2. hai\n3. ba]');
  });

  it('quote thêm "> "', () => {
    expect(run('quote', '[trích dẫn]')).toBe('[> trích dẫn]');
  });

  it('tiền tố áp cho cả dòng dù chỉ bôi đen một phần', () => {
    expect(run('bulletList', 'một [hai] ba')).toBe('[- một hai ba]');
  });
});

describe('applyCommand — chèn khối', () => {
  it('link bôi sẵn chữ url để gõ đè ngay', () => {
    expect(run('link', 'xem [tài liệu] nhé')).toBe('xem [tài liệu]([url]) nhé');
  });

  it('code block bọc bằng fence và tách khỏi đoạn trên', () => {
    expect(run('codeBlock', 'đoạn văn\n\n[mã nguồn]')).toBe('đoạn văn\n\n```\n[mã nguồn]\n```');
  });

  it('code block ở đầu file thì không chèn dòng trống thừa', () => {
    expect(run('codeBlock', '[mã]')).toBe('```\n[mã]\n```');
  });
});
