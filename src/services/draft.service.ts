import type { CapturePayload } from '../types/capture';

const DRAFT_PREFIX = 'p2m_draft_';
/** Draft quá hạn là rác của những lần user đóng tab mà không lưu. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface Draft {
  id: string;
  payload: CapturePayload;
  createdAt: number;
}

/**
 * Editor nằm ở tab khác nên không có quyền đọc trang gốc: nội dung phải được
 * chụp ở background lúc activeTab còn hiệu lực, rồi bàn giao qua storage.local.
 * URL không chở nổi vì một bài viết dài hơn giới hạn địa chỉ rất nhiều.
 */
class DraftService {
  private key(id: string): string {
    return `${DRAFT_PREFIX}${id}`;
  }

  async create(payload: CapturePayload): Promise<string> {
    const id = crypto.randomUUID();
    const draft: Draft = { id, payload, createdAt: Date.now() };
    await chrome.storage.local.set({ [this.key(id)]: draft });
    return id;
  }

  async read(id: string): Promise<Draft | null> {
    const stored = await chrome.storage.local.get(this.key(id));
    return (stored[this.key(id)] as Draft | undefined) ?? null;
  }

  async remove(id: string): Promise<void> {
    await chrome.storage.local.remove(this.key(id));
  }

  /** Dọn draft cũ để storage.local không phình theo thời gian. */
  async purgeExpired(now: number = Date.now()): Promise<number> {
    const all = await chrome.storage.local.get(null);
    const stale = Object.entries(all)
      .filter(([key]) => key.startsWith(DRAFT_PREFIX))
      .filter(([, value]) => now - ((value as Draft).createdAt ?? 0) > DRAFT_TTL_MS)
      .map(([key]) => key);

    if (stale.length > 0) await chrome.storage.local.remove(stale);
    return stale.length;
  }
}

export const draftService = new DraftService();
