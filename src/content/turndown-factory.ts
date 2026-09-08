import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { detectLanguage } from './dom-cleaner';
import type { ExtractOptions } from '../types/settings';

/** Fence phải dài hơn chuỗi backtick dài nhất nằm trong code, nếu không sẽ đứt sớm. */
function fenceFor(code: string): string {
  const longest = code.match(/`+/g)?.reduce((max, run) => Math.max(max, run.length), 0) ?? 0;
  return '`'.repeat(Math.max(3, longest + 1));
}

function addCodeBlockRule(service: TurndownService, options: ExtractOptions): void {
  // Turndown mặc định vứt mất tên ngôn ngữ; giữ lại để file Markdown còn
  // highlight được khi mở trong editor.
  service.addRule('fencedCodeWithLanguage', {
    filter: (node) => node.nodeName === 'PRE' && (node.textContent ?? '').trim().length > 0,
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const codeElement = element.querySelector('code');
      const code = (codeElement ?? element).textContent?.replace(/\n+$/, '') ?? '';

      if (options.codeBlockStyle === 'indented') {
        const indented = code
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');
        return `\n\n${indented}\n\n`;
      }

      const fence = fenceFor(code);
      return `\n\n${fence}${detectLanguage(element, codeElement)}\n${code}\n${fence}\n\n`;
    },
  });
}

function addListRule(service: TurndownService): void {
  // Turndown mặc định đệm "-   " (4 cột). Dùng "- " cho khớp thói quen của
  // Obsidian/Prettier, và thụt con đúng bằng độ dài prefix — thụt thiếu là
  // CommonMark hiểu list lồng nhau thành list cùng cấp.
  service.addRule('compactListItem', {
    filter: 'li',
    replacement: (content, node, turndownOptions) => {
      const parent = node.parentNode as HTMLElement | null;

      let prefix = `${turndownOptions.bulletListMarker} `;
      if (parent?.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start'));
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${(Number.isFinite(start) && start > 0 ? start : 1) + index}. `;
      }

      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);

      const needsBreak = node.nextSibling !== null && !/\n$/.test(body);
      return prefix + body + (needsBreak ? '\n' : '');
    },
  });
}

export function createTurndownService(options: ExtractOptions): TurndownService {
  const service = new TurndownService({
    headingStyle: options.headingStyle,
    bulletListMarker: options.bulletMarker,
    codeBlockStyle: options.codeBlockStyle,
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    hr: '---',
    br: '  ',
    preformattedCode: true,
  });

  service.use(gfm);
  addCodeBlockRule(service, options);
  addListRule(service);

  service.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content) => (content.trim().length > 0 ? `\n\n_${content.trim()}_\n\n` : ''),
  });

  return service;
}
