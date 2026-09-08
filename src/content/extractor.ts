import { extractMarkdown } from './extract';
import { MessageType } from '../types/messages';
import type { ContentMessage } from '../types/messages';
import type { ExtractResponse } from '../types/capture';

/**
 * Entry của content script. Được inject theo yêu cầu (activeTab) chứ không khai
 * báo tĩnh trong manifest, nên không tốn gì trên những trang người dùng không lưu.
 */

declare global {
  interface Window {
    __P2M_LISTENER_READY__?: boolean;
  }
}

// Inject lại vào tab đã có script sẽ nhân đôi listener; cờ này chặn việc đó.
if (!window.__P2M_LISTENER_READY__) {
  window.__P2M_LISTENER_READY__ = true;

  chrome.runtime.onMessage.addListener(
    (message: ContentMessage, _sender, sendResponse: (response: ExtractResponse | true) => void) => {
      if (message.type === MessageType.PING) {
        sendResponse(true);
        return false;
      }

      if (message.type === MessageType.EXTRACT) {
        try {
          sendResponse({ ok: true, payload: extractMarkdown(message.options) });
        } catch (error) {
          // Lỗi phải quay về popup dưới dạng thông điệp đọc được; chi tiết đầy đủ
          // nằm lại trong console của trang để còn lần ra nguyên nhân.
          console.error('[Page2Markdown] extraction failed:', error);
          const reason = error instanceof Error ? error.message : String(error);
          sendResponse({ ok: false, error: reason });
        }
        return false;
      }

      return false;
    }
  );
}
