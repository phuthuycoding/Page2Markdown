import extractorScript from '../content/extractor?script&iife';
import { BLOCKED_URL_PREFIXES } from '../config';
import { settingsService } from './settings.service';
import { MessageType } from '../types/messages';
import type { CapturePayload, ExtractResponse } from '../types/capture';
import type { Settings } from '../types/settings';

/** Lỗi có thông điệp đủ rõ để hiển thị thẳng cho người dùng. */
export class CaptureError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CaptureError';
  }
}

class CaptureService {
  private assertCapturable(tab: chrome.tabs.Tab): asserts tab is chrome.tabs.Tab & { id: number } {
    if (typeof tab?.id !== 'number') {
      throw new CaptureError('Could not identify the current tab.');
    }
    const url = tab.url ?? '';
    const blocked = BLOCKED_URL_PREFIXES.find((prefix) => url.startsWith(prefix));
    if (blocked) {
      // Nêu đúng trang đang bị chặn: người dùng hay bấm thử ngay trên
      // chrome://extensions sau khi cài, và một câu chung chung không nói được
      // rằng lỗi nằm ở chỗ đang đứng chứ không phải ở extension.
      throw new CaptureError(
        `Chrome blocks extensions on ${blocked} pages. Open a normal web page and try again.`
      );
    }
  }

  /**
   * Ping trước rồi mới inject: tab đã có content script thì khỏi nạp lại bundle,
   * mở popup lần hai trên cùng trang sẽ nhanh hơn hẳn.
   */
  private async ensureInjected(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, { type: MessageType.PING });
      return;
    } catch {
      // Chưa có content script trong tab này — đây là đường đi bình thường của
      // lần lưu đầu tiên, không phải lỗi.
    }

    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [extractorScript] });
    } catch (error) {
      throw new CaptureError(
        'Could not inject the script into this page. Chrome blocks PDFs, system pages, and file:// URLs (unless you enable file access).',
        { cause: error }
      );
    }
  }

  async capture(tab: chrome.tabs.Tab, settings: Settings): Promise<CapturePayload> {
    this.assertCapturable(tab);
    await this.ensureInjected(tab.id);

    let response: ExtractResponse | undefined;
    try {
      response = (await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.EXTRACT,
        options: settingsService.toExtractOptions(settings),
      })) as ExtractResponse | undefined;
    } catch (error) {
      throw new CaptureError('The page did not respond. Reload it and try again.', {
        cause: error,
      });
    }

    if (!response) throw new CaptureError('The content script returned no result.');
    if (!response.ok) throw new CaptureError(response.error);
    return response.payload;
  }
}

export const captureService = new CaptureService();
