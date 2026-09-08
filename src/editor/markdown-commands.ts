export type CommandName =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'codeBlock'
  | 'link'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList';

interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

interface Selection {
  text: string;
  start: number;
  end: number;
}

/** Bọc vùng chọn bằng cặp dấu, bấm lại lần nữa thì gỡ ra. */
function wrap(value: string, sel: Selection, marker: string): EditResult {
  const before = value.slice(0, sel.start);
  const after = value.slice(sel.end);

  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      text: before.slice(0, -marker.length) + sel.text + after.slice(marker.length),
      selectionStart: sel.start - marker.length,
      selectionEnd: sel.end - marker.length,
    };
  }

  return {
    text: `${before}${marker}${sel.text}${marker}${after}`,
    selectionStart: sel.start + marker.length,
    selectionEnd: sel.end + marker.length,
  };
}

/** Thêm/gỡ tiền tố cho từng dòng của vùng chọn (heading, quote, list). */
function prefixLines(
  value: string,
  sel: Selection,
  makePrefix: (index: number) => string
): EditResult {
  const lineStart = value.lastIndexOf('\n', sel.start - 1) + 1;
  const lineEndIndex = value.indexOf('\n', sel.end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const firstPrefix = makePrefix(0);
  const alreadyPrefixed = lines.every((line) => line.startsWith(firstPrefix));

  const next = lines
    .map((line, index) =>
      alreadyPrefixed ? line.slice(firstPrefix.length) : `${makePrefix(index)}${line}`
    )
    .join('\n');

  const text = value.slice(0, lineStart) + next + value.slice(lineEnd);
  return { text, selectionStart: lineStart, selectionEnd: lineStart + next.length };
}

function insertBlock(value: string, sel: Selection, open: string, close: string): EditResult {
  const prefix = sel.start > 0 && !value.slice(0, sel.start).endsWith('\n\n') ? '\n\n' : '';
  const inserted = `${prefix}${open}${sel.text}${close}`;
  return {
    text: value.slice(0, sel.start) + inserted + value.slice(sel.end),
    selectionStart: sel.start + prefix.length + open.length,
    selectionEnd: sel.start + prefix.length + open.length + sel.text.length,
  };
}

/**
 * Thuần hàm trên chuỗi: không đụng DOM nên test được thẳng, còn phần gán lại
 * vào textarea do editor lo.
 */
export function applyCommand(command: CommandName, value: string, sel: Selection): EditResult {
  switch (command) {
    case 'bold':
      return wrap(value, sel, '**');
    case 'italic':
      return wrap(value, sel, '_');
    case 'strikethrough':
      return wrap(value, sel, '~~');
    case 'code':
      return wrap(value, sel, '`');
    case 'codeBlock':
      return insertBlock(value, sel, '```\n', '\n```');
    case 'link':
      return {
        text: `${value.slice(0, sel.start)}[${sel.text}](url)${value.slice(sel.end)}`,
        // Bôi sẵn chữ "url" để gõ đè ngay, khỏi phải rê chuột chọn lại.
        selectionStart: sel.start + sel.text.length + 3,
        selectionEnd: sel.start + sel.text.length + 6,
      };
    case 'heading':
      return prefixLines(value, sel, () => '## ');
    case 'quote':
      return prefixLines(value, sel, () => '> ');
    case 'bulletList':
      return prefixLines(value, sel, () => '- ');
    case 'orderedList':
      return prefixLines(value, sel, (index) => `${index + 1}. `);
  }
}
