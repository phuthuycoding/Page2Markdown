import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../config';
import type { ExtractOptions, Settings } from '../types/settings';

class SettingsService {
  async load(): Promise<Settings> {
    const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
    const saved = stored[SETTINGS_STORAGE_KEY] as Partial<Settings> | undefined;
    return { ...DEFAULT_SETTINGS, ...saved };
  }

  /** Ghi đè một phần settings, trả về bản đầy đủ sau khi ghi. */
  async patch(changes: Partial<Settings>): Promise<Settings> {
    const next: Settings = { ...(await this.load()), ...changes };
    await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: next });
    return next;
  }

  async reset(): Promise<Settings> {
    await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }

  /** Chỉ gửi sang content script phần nó thực sự dùng. */
  toExtractOptions(settings: Settings): ExtractOptions {
    return {
      contentMode: settings.contentMode,
      imageMode: settings.imageMode,
      includeLinks: settings.includeLinks,
      headingStyle: settings.headingStyle,
      bulletMarker: settings.bulletMarker,
      codeBlockStyle: settings.codeBlockStyle,
    };
  }
}

export const settingsService = new SettingsService();
