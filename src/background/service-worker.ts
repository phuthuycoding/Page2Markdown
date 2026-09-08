import { LAST_WELCOME_VERSION_KEY, WELCOME_URL, shouldWelcome } from '../config';
import { captureService } from '../services/capture.service';
import { draftService } from '../services/draft.service';
import { settingsService } from '../services/settings.service';

const MENU_CAPTURE = 'p2m-capture';
const CAPTURE_COMMAND = 'capture-page';
const BADGE_DURATION_MS = 2500;
const EDITOR_PAGE = 'src/editor/editor.html';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_CAPTURE,
      title: 'Save Page To Markdown',
      contexts: ['page', 'selection'],
    });
  });

  void maybeOpenWelcome(details);
  void draftService.purgeExpired();
});

/**
 * Welcome nằm trên web nên nội dung sửa được mà không phải nộp lại bản build.
 * Chỉ mở khi cài mới hoặc lên minor/major: tự mở tab ở mọi bản vá là cách nhanh
 * nhất để ăn một sao.
 */
async function maybeOpenWelcome(details: chrome.runtime.InstalledDetails): Promise<void> {
  if (!WELCOME_URL) return;
  if (details.reason !== 'install' && details.reason !== 'update') return;

  const current = chrome.runtime.getManifest().version;
  const stored = await chrome.storage.local.get(LAST_WELCOME_VERSION_KEY);
  const previous = stored[LAST_WELCOME_VERSION_KEY] as string | undefined;

  if (!shouldWelcome(details.reason === 'install' ? undefined : previous, current)) return;

  await chrome.storage.local.set({ [LAST_WELCOME_VERSION_KEY]: current });
  await chrome.tabs.create({ url: `${WELCOME_URL}?v=${current}&reason=${details.reason}` });
}

async function flashBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => void chrome.action.setBadgeText({ text: '' }), BADGE_DURATION_MS);
}

/**
 * Chụp phải làm ở đây chứ không phải trong editor: quyền activeTab chỉ sống
 * trong lượt người dùng vừa ra lệnh, còn editor là một tab khác và không có
 * quyền gì với trang gốc.
 */
async function captureToEditor(tab: chrome.tabs.Tab | undefined): Promise<void> {
  if (!tab) return;

  try {
    const settings = await settingsService.load();
    const payload = await captureService.capture(tab, settings);
    const draftId = await draftService.create(payload);

    await chrome.tabs.create({
      url: chrome.runtime.getURL(`${EDITOR_PAGE}?draft=${draftId}`),
      index: typeof tab.index === 'number' ? tab.index + 1 : undefined,
    });
  } catch (error) {
    // Không xin quyền notifications nên badge là kênh báo lỗi duy nhất; nguyên
    // nhân đầy đủ nằm ở console của service worker.
    console.error('[Page2Markdown] capture failed:', error);
    await flashBadge('ERR', '#ef4444');
  }
}

chrome.action.onClicked.addListener((tab) => {
  void captureToEditor(tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_CAPTURE) return;
  void captureToEditor(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== CAPTURE_COMMAND) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await captureToEditor(tab);
});
