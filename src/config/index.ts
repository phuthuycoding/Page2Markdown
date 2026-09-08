import type { Settings } from '../types/settings';

export const SETTINGS_STORAGE_KEY = 'p2m_settings';

/** Phiên bản đã chào mừng lần gần nhất, để biết khi nào nên mở welcome. */
export const LAST_WELCOME_VERSION_KEY = 'p2m_last_welcome_version';

/**
 * Trang chào mừng nằm trên web của mình chứ không phải trang extension: nội dung
 * và quảng cáo ở đó sửa được bất cứ lúc nào, không phải build lại rồi chờ Google
 * duyệt. Để rỗng thì extension không mở tab nào cả.
 */
export const WELCOME_URL = '';

/** Chỉ mở lại welcome khi lên minor/major — patch thì im lặng cho đỡ phiền. */
export function shouldWelcome(previous: string | undefined, current: string): boolean {
  if (!previous) return true;
  const [prevMajor = '0', prevMinor = '0'] = previous.split('.');
  const [curMajor = '0', curMinor = '0'] = current.split('.');
  return prevMajor !== curMajor || prevMinor !== curMinor;
}

/** Tác giả, hiện ở chân editor và trang cài đặt. */
export const AUTHOR_NAME = 'phuthuycoding';
export const AUTHOR_URL = 'https://github.com/phuthuycoding';

/**
 * Repo công khai. LƯU Ý: repo đang để private cho tới khi extension lên store —
 * bật link này ra bản phát hành trước khi chuyển repo sang public thì người
 * dùng bấm vào chỉ nhận 404.
 */
export const REPO_URL = 'https://github.com/phuthuycoding/Page2Markdown';

/**
 * Nút ủng hộ. Chỉ là một link ra ngoài — không nhúng cổng thanh toán nào vào
 * extension, vì Chrome Web Store cấm xử lý thanh toán bên trong.
 *
 * Để rỗng thì nút tự ẩn. Repo public rồi thì dùng thẳng
 * https://github.com/sponsors/<username>: 0% phí và Việt Nam có trong danh
 * sách vùng được hỗ trợ.
 */
export const DONATE_URL = '';

/** Chữ trên nút. Câu mời cụ thể ("Buy me a coffee") ăn hơn chữ "Donate" trơ trọi. */
export const DONATE_LABEL = 'Buy me a coffee';

export const DEFAULT_SETTINGS: Settings = {
  contentMode: 'article',
  imageMode: 'keep',
  includeLinks: true,

  includeFrontmatter: true,
  includeTitleHeading: true,
  frontmatterFields: ['title', 'source', 'author', 'published', 'captured', 'description'],
  defaultTags: [],

  filenameTemplate: '{date}-{slug}',
  downloadFolder: 'Page2Markdown',
  askLocation: false,

  headingStyle: 'atx',
  bulletMarker: '-',
  codeBlockStyle: 'fenced',
};

/**
 * Chrome không cho content script chạy trên các scheme này, chặn sớm ở đây để
 * báo cho user một câu rõ ràng thay vì để executeScript ném lỗi khó hiểu.
 */
export const BLOCKED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'view-source:',
  'https://chromewebstore.google.com',
  'https://chrome.google.com/webstore',
];

/** Ngưỡng ký tự tối thiểu để tin rằng Readability tìm đúng phần thân bài. */
export const READABILITY_MIN_CHARS = 200;

/** Thẻ luôn bị loại vì không mang nội dung đọc được. */
export const NOISE_SELECTOR = [
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'object',
  'embed',
  'form',
  'button',
  'input',
  'select',
  'textarea',
  '[aria-hidden="true"]',
  '[hidden]',
].join(',');

/** Chỉ loại ở chế độ "toàn trang" — chế độ article đã được Readability lọc sẵn. */
export const LAYOUT_NOISE_SELECTOR = ['nav', 'header', 'footer', 'aside'].join(',');

/** Thuộc tính chứa URL thật của ảnh lazy-load. */
export const LAZY_IMAGE_ATTRS = ['data-src', 'data-original', 'data-lazy-src', 'data-actualsrc'];

/**
 * Readability xoá sạch class nên tên ngôn ngữ của code block bay mất. Ta đóng
 * dấu sang data-* (Readability giữ nguyên) trước khi cho nó parse.
 */
export const CODE_LANG_ATTR = 'data-p2m-lang';
