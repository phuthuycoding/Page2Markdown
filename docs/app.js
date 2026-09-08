/**
 * Gõ dần khối Markdown ở hero. Viết tay thay vì kéo một thư viện typing về:
 * chỗ này cần đúng một hiệu ứng, mà thêm dependency là thêm một request nữa
 * phải chờ trước khi trang hiện ra.
 */
(() => {
  const target = document.getElementById('typed');
  const caret = document.getElementById('caret');
  if (!target) return;

  /** Mỗi dòng kèm class để tô màu; null nghĩa là chữ thường. */
  const LINES = [
    ['---', 'fm'],
    ['title: "How Vietnamese coffee took over"', 'fm'],
    ['source: "https://example.com/ca-phe"', 'fm'],
    ['author: "Jane Cooper"', 'fm'],
    ['published: "2026-01-15"', 'fm'],
    ['---', 'fm'],
    ['', null],
    ['# How Vietnamese coffee took over', 'h1'],
    ['', null],
    ['Robusta beans, condensed milk, and a', null],
    ['**phin** filter that refuses to hurry.', null],
    ['', null],
    ['## What you need', 'h1'],
    ['', null],
    ['- Dark roast robusta, coarsely ground', null],
    ['- A phin filter', null],
    ['- Condensed milk, to taste', null],
  ];

  const CHAR_MS = 16;
  const LINE_PAUSE_MS = 90;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Đổ thẳng toàn bộ nội dung, dùng cho reduced-motion và khi tab bị ẩn. */
  function renderAll() {
    target.replaceChildren();
    for (const [text, className] of LINES) {
      target.append(makeLine(text, className), document.createTextNode('\n'));
    }
  }

  function makeLine(text, className) {
    if (!className) return document.createTextNode(text);
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  if (reduced) {
    renderAll();
    if (caret) caret.style.display = 'none';
    return;
  }

  let lineIndex = 0;
  let charIndex = 0;
  let current = null;

  function step() {
    // Tab ẩn thì setTimeout bị bóp về ~1s/lần, gõ dở sẽ trông như treo.
    if (document.hidden) {
      renderAll();
      return;
    }

    if (lineIndex >= LINES.length) {
      if (caret) caret.style.display = 'none';
      return;
    }

    const [text, className] = LINES[lineIndex];

    if (charIndex === 0) {
      current = makeLine('', className);
      target.append(current);
    }

    if (charIndex < text.length) {
      current.textContent += text[charIndex];
      charIndex += 1;
      setTimeout(step, CHAR_MS);
      return;
    }

    target.append(document.createTextNode('\n'));
    lineIndex += 1;
    charIndex = 0;
    setTimeout(step, LINE_PAUSE_MS);
  }

  // Chờ một nhịp để trang vẽ xong rồi mới gõ, tránh giật lúc tải.
  setTimeout(step, 320);
})();
