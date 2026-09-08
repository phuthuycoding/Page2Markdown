import { DONATE_LABEL, DONATE_URL } from '../config';
import { settingsService } from '../services/settings.service';
import type {
  BulletMarker,
  CodeBlockStyle,
  ContentMode,
  FrontmatterField,
  HeadingStyle,
  ImageMode,
  Settings,
} from '../types/settings';

/** Thứ tự ở đây cũng là thứ tự các dòng trong khối frontmatter. */
const FRONTMATTER_FIELDS: FrontmatterField[] = [
  'title',
  'source',
  'author',
  'published',
  'captured',
  'description',
  'site',
  'tags',
];

const TEXT_INPUT_KEYS = ['filenameTemplate', 'downloadFolder'] as const;
const CHECKBOX_KEYS = [
  'includeLinks',
  'includeFrontmatter',
  'includeTitleHeading',
  'askLocation',
] as const;
const SELECT_KEYS = [
  'contentMode',
  'imageMode',
  'headingStyle',
  'bulletMarker',
  'codeBlockStyle',
] as const;

const STATUS_DURATION_MS = 1500;

const statusEl = document.getElementById('status') as HTMLElement;
const fieldsEl = document.getElementById('frontmatterFields') as HTMLElement;
const tagsEl = document.getElementById('defaultTags') as HTMLInputElement;
let statusTimer: ReturnType<typeof setTimeout> | undefined;

function input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function select(id: string): HTMLSelectElement {
  return document.getElementById(id) as HTMLSelectElement;
}

function flashStatus(text = 'Saved'): void {
  statusEl.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '';
  }, STATUS_DURATION_MS);
}

async function persistFrontmatterFields(): Promise<void> {
  const checked = new Set(
    Array.from(fieldsEl.querySelectorAll<HTMLInputElement>('input:checked')).map((node) => node.value)
  );
  // Lọc theo FRONTMATTER_FIELDS để thứ tự các dòng không đảo giữa các lần lưu.
  const ordered = FRONTMATTER_FIELDS.filter((field) => checked.has(field));
  await settingsService.patch({ frontmatterFields: ordered });
  flashStatus();
}

function renderFrontmatterChips(selected: FrontmatterField[]): void {
  fieldsEl.replaceChildren();

  for (const field of FRONTMATTER_FIELDS) {
    const chip = document.createElement('label');
    chip.className = 'chip';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = field;
    checkbox.checked = selected.includes(field);
    checkbox.addEventListener('change', () => void persistFrontmatterFields());

    chip.append(checkbox, document.createTextNode(field));
    fieldsEl.append(chip);
  }
}

function applyToForm(settings: Settings): void {
  for (const key of TEXT_INPUT_KEYS) input(key).value = settings[key];
  for (const key of CHECKBOX_KEYS) input(key).checked = settings[key];
  for (const key of SELECT_KEYS) select(key).value = settings[key];
  tagsEl.value = settings.defaultTags.join(', ');
  renderFrontmatterChips(settings.frontmatterFields);
}

function bindAutoSave(): void {
  for (const key of TEXT_INPUT_KEYS) {
    const node = input(key);
    node.addEventListener('change', async () => {
      await settingsService.patch({ [key]: node.value.trim() });
      flashStatus();
    });
  }

  for (const key of CHECKBOX_KEYS) {
    const node = input(key);
    node.addEventListener('change', async () => {
      await settingsService.patch({ [key]: node.checked });
      flashStatus();
    });
  }

  // Mỗi select ánh xạ sang đúng một union type, nên ép kiểu tại chỗ thay vì
  // dùng một hàm chung mất kiểu.
  select('contentMode').addEventListener('change', async (event) => {
    await settingsService.patch({ contentMode: (event.target as HTMLSelectElement).value as ContentMode });
    flashStatus();
  });
  select('imageMode').addEventListener('change', async (event) => {
    await settingsService.patch({ imageMode: (event.target as HTMLSelectElement).value as ImageMode });
    flashStatus();
  });
  select('headingStyle').addEventListener('change', async (event) => {
    await settingsService.patch({ headingStyle: (event.target as HTMLSelectElement).value as HeadingStyle });
    flashStatus();
  });
  select('bulletMarker').addEventListener('change', async (event) => {
    await settingsService.patch({ bulletMarker: (event.target as HTMLSelectElement).value as BulletMarker });
    flashStatus();
  });
  select('codeBlockStyle').addEventListener('change', async (event) => {
    await settingsService.patch({
      codeBlockStyle: (event.target as HTMLSelectElement).value as CodeBlockStyle,
    });
    flashStatus();
  });

  tagsEl.addEventListener('change', async () => {
    const tags = tagsEl.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    await settingsService.patch({ defaultTags: tags });
    flashStatus();
  });

  document.getElementById('reset')?.addEventListener('click', async () => {
    applyToForm(await settingsService.reset());
    flashStatus('Reset to defaults');
  });
}

function renderDonate(): void {
  if (!DONATE_URL) return;
  const link = document.getElementById('donate') as HTMLAnchorElement;
  link.href = DONATE_URL;
  link.textContent = `☕ ${DONATE_LABEL}`;
  link.classList.remove('hidden');
}

async function bootstrap(): Promise<void> {
  applyToForm(await settingsService.load());
  bindAutoSave();
  renderDonate();
}

void bootstrap();
