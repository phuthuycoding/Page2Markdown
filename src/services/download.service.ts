import { buildFilename, withDownloadFolder } from '../utils/filename';
import type { DownloadResult, PageMeta } from '../types/capture';
import type { Settings } from '../types/settings';

/** Chrome vẫn đang ghi file thì chờ, nhưng không chờ vô hạn. */
const COMPLETION_TIMEOUT_MS = 20_000;

export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadError';
  }
}

function describe(reason: string | undefined): string {
  switch (reason) {
    case 'USER_CANCELED':
      return 'Download was cancelled.';
    case 'FILE_ACCESS_DENIED':
      return 'Chrome could not write to that folder. Check the download location in settings.';
    case 'FILE_NO_SPACE':
      return 'Not enough disk space.';
    case 'FILE_NAME_TOO_LONG':
      return 'The filename is too long. Shorten the filename template in settings.';
    default:
      return reason ? `Download failed (${reason}).` : 'Download failed.';
  }
}

class DownloadService {
  /**
   * chrome.downloads.download() trả về id ngay khi Chrome *nhận* lệnh, không
   * phải khi file đã ghi xong — báo thành công ở đó là báo dối, người dùng mở
   * thư mục ra thì chẳng thấy gì. Phải đợi đến trạng thái cuối cùng.
   */
  private waitForCompletion(downloadId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: string): void => {
        clearTimeout(timer);
        chrome.downloads.onChanged.removeListener(onChanged);
        if (error) reject(new DownloadError(describe(error)));
        else resolve();
      };

      const onChanged = (delta: chrome.downloads.DownloadDelta): void => {
        if (delta.id !== downloadId) return;
        if (delta.state?.current === 'complete') finish();
        else if (delta.state?.current === 'interrupted') finish(delta.error?.current ?? 'unknown');
      };

      const timer = setTimeout(() => finish('TIMEOUT'), COMPLETION_TIMEOUT_MS);

      chrome.downloads.onChanged.addListener(onChanged);

      // Download nhỏ có thể xong trước khi listener kịp gắn, nên soát lại một lần.
      void chrome.downloads.search({ id: downloadId }).then(([item]) => {
        if (item?.state === 'complete') finish();
        else if (item?.state === 'interrupted') finish(item.error ?? 'unknown');
      });
    });
  }

  /**
   * Blob URL thay vì data URL: trang editor có DOM nên dùng được
   * URL.createObjectURL, và như vậy không phải nhồi cả bài viết qua một chuỗi
   * địa chỉ đã bị encodeURIComponent làm phình lên gấp mấy lần.
   */
  async saveText(text: string, meta: PageMeta, settings: Settings): Promise<DownloadResult> {
    const filename = withDownloadFolder(
      buildFilename(settings.filenameTemplate, meta),
      settings.downloadFolder
    );
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const downloadId = await chrome.downloads.download({
        url,
        filename,
        saveAs: settings.askLocation,
      });
      await this.waitForCompletion(downloadId);
      return { downloadId, filename, bytes: blob.size };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export const downloadService = new DownloadService();
