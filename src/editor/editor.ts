import { DONATE_LABEL, DONATE_URL } from '../config';
import { downloadService } from '../services/download.service';
import { draftService } from '../services/draft.service';
import { settingsService } from '../services/settings.service';
import { buildFilename, withDownloadFolder } from '../utils/filename';
import { buildFrontmatter } from '../utils/markdown';
import { applyCommand, type CommandName } from './markdown-commands';
import { renderPreview } from './preview';
import type { CapturePayload, CaptureSource } from '../types/capture';
import type { ContentMode, ImageMode, Settings } from '../types/settings';

const SOURCE_LABEL: Record<CaptureSource, string> = {
  selection: 'Selection',
  readability: 'Article (cleaned)',
  body: 'Whole page',
};

const TOAST_DURATION_MS = 2000;
const PREVIEW_DEBOUNCE_MS = 180;

const el = {
  loading: document.getElementById('stateLoading') as HTMLElement,
  error: document.getElementById('stateError') as HTMLElement,
  errorMessage: document.getElementById('errorMessage') as HTMLElement,
  ready: document.getElementById('stateReady') as HTMLElement,
  title: document.getElementById('title') as HTMLInputElement,
  sourceBadge: document.getElementById('sourceBadge') as HTMLElement,
  stats: document.getElementById('stats') as HTMLElement,
  contentMode: document.getElementById('contentMode') as HTMLSelectElement,
  imageMode: document.getElementById('imageMode') as HTMLSelectElement,
  frontmatter: document.getElementById('frontmatter') as HTMLInputElement,
  showPreview: document.getElementById('showPreview') as HTMLInputElement,
  panes: document.getElementById('panes') as HTMLElement,
  markdown: document.getElementById('markdown') as HTMLTextAreaElement,
  preview: document.getElementById('preview') as HTMLIFrameElement,
  filename: document.getElementById('filename') as HTMLElement,
  copy: document.getElementById('copy') as HTMLButtonElement,
  download: document.getElementById('download') as HTMLButtonElement,
  openOptions: document.getElementById('openOptions') as HTMLButtonElement,
  donate: document.getElementById('donate') as HTMLAnchorElement,
  toast: document.getElementById('toast') as HTMLElement,
};

let settings: Settings;
let payload: CapturePayload;
let draftId: string | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;

function showState(name: 'loading' | 'error' | 'ready'): void {
  el.loading.classList.toggle('hidden', name !== 'loading');
  el.error.classList.toggle('hidden', name !== 'error');
  el.ready.classList.toggle('hidden', name !== 'ready');
}

function toast(message: string): void {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), TOAST_DURATION_MS);
}

function fail(message: string): void {
  el.errorMessage.textContent = message;
  showState('error');
}

function renderFilename(): void {
  el.filename.textContent = withDownloadFolder(
    buildFilename(settings.filenameTemplate, payload.meta),
    settings.downloadFolder
  );
}

function schedulePreview(): void {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    el.preview.srcdoc = renderPreview(el.markdown.value);
  }, PREVIEW_DEBOUNCE_MS);
}

/**
 * Chỉ dựng lại phần frontmatter và tiêu đề ở đầu file, giữ nguyên phần thân mà
 * người dùng có thể đã sửa tay — đây là khác biệt so với popup cũ, nơi mỗi thay
 * đổi đều ghi đè toàn bộ ô soạn thảo.
 */
function rebuildHeader(): void {
  const body = stripHeader(el.markdown.value);
  const frontmatter = buildFrontmatter(payload.meta, settings);
  const heading =
    settings.includeTitleHeading && payload.meta.title ? `# ${payload.meta.title}\n\n` : '';
  el.markdown.value = frontmatter + heading + body;
  renderFilename();
  schedulePreview();
}

/** Bóc frontmatter và dòng H1 tiêu đề để dựng lại, phần còn lại là của user. */
function stripHeader(text: string): string {
  let rest = text.replace(/^---\n[\s\S]*?\n---\n*/, '');
  rest = rest.replace(/^# .*\n+/, '');
  return rest;
}

function renderDonate(): void {
  if (!DONATE_URL) return;
  el.donate.href = DONATE_URL;
  el.donate.textContent = `☕ ${DONATE_LABEL}`;
  el.donate.classList.remove('hidden');
}

function bindToolbar(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.toolbar button[data-command]')) {
    button.addEventListener('click', () => runCommand(button.dataset.command as CommandName));
  }

  el.markdown.addEventListener('keydown', (event) => {
    if (!event.metaKey && !event.ctrlKey) return;
    const shortcuts: Record<string, CommandName> = { b: 'bold', i: 'italic', k: 'link' };
    const command = shortcuts[event.key.toLowerCase()];
    if (!command) return;
    event.preventDefault();
    runCommand(command);
  });
}

function runCommand(command: CommandName): void {
  const { value, selectionStart, selectionEnd } = el.markdown;
  const result = applyCommand(command, value, {
    text: value.slice(selectionStart, selectionEnd),
    start: selectionStart,
    end: selectionEnd,
  });

  el.markdown.value = result.text;
  el.markdown.setSelectionRange(result.selectionStart, result.selectionEnd);
  el.markdown.focus();
  schedulePreview();
}

function bindControls(): void {
  el.markdown.addEventListener('input', schedulePreview);

  el.showPreview.addEventListener('change', () => {
    el.panes.classList.toggle('single', !el.showPreview.checked);
  });

  el.title.addEventListener('input', () => {
    payload.meta.title = el.title.value;
    rebuildHeader();
  });

  el.frontmatter.addEventListener('change', async () => {
    settings = await settingsService.patch({ includeFrontmatter: el.frontmatter.checked });
    rebuildHeader();
  });

  // contentMode và imageMode quyết định lúc chuyển HTML sang Markdown, mà việc
  // đó đã xong trước khi tab này mở. Đổi ở đây chỉ có tác dụng cho lần sau.
  el.contentMode.addEventListener('change', async () => {
    settings = await settingsService.patch({ contentMode: el.contentMode.value as ContentMode });
    toast('Applies to your next capture');
  });

  el.imageMode.addEventListener('change', async () => {
    settings = await settingsService.patch({ imageMode: el.imageMode.value as ImageMode });
    toast('Applies to your next capture');
  });

  el.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el.markdown.value);
      toast('Markdown copied');
    } catch (error) {
      console.error('[Page2Markdown] copy failed:', error);
      toast('Clipboard blocked — copy manually');
    }
  });

  el.download.addEventListener('click', async () => {
    el.download.disabled = true;
    try {
      const result = await downloadService.saveText(el.markdown.value, payload.meta, settings);
      toast(`Saved ${result.filename}`);
      if (draftId) await draftService.remove(draftId);
    } catch (error) {
      console.error('[Page2Markdown] download failed:', error);
      toast(error instanceof Error ? `Save failed: ${error.message}` : 'Save failed');
    } finally {
      el.download.disabled = false;
    }
  });

  el.openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

async function bootstrap(): Promise<void> {
  settings = await settingsService.load();
  draftId = new URLSearchParams(location.search).get('draft');

  if (!draftId) {
    fail('No capture to show. Click the Page2Markdown icon on a web page to start one.');
    return;
  }

  const draft = await draftService.read(draftId);
  if (!draft) {
    fail('This capture has expired. Go back to the page and capture it again.');
    return;
  }

  payload = draft.payload;
  document.title = `${payload.meta.title || 'Untitled'} — Page2Markdown`;

  el.title.value = payload.meta.title;
  el.sourceBadge.textContent = SOURCE_LABEL[payload.source];
  el.stats.textContent = `${payload.stats.words} words · ${payload.stats.images} images · ${payload.stats.links} links`;
  el.contentMode.value = settings.contentMode;
  el.imageMode.value = settings.imageMode;
  el.frontmatter.checked = settings.includeFrontmatter;

  el.markdown.value =
    buildFrontmatter(payload.meta, settings) +
    (settings.includeTitleHeading && payload.meta.title ? `# ${payload.meta.title}\n\n` : '') +
    payload.markdown.trim() +
    '\n';

  renderFilename();
  renderDonate();
  bindToolbar();
  bindControls();
  schedulePreview();
  showState('ready');
}

void bootstrap();
