/** Phạm vi nội dung lấy từ trang. */
export type ContentMode = 'article' | 'full';

/** Cách xử lý thẻ img khi chuyển sang Markdown. */
export type ImageMode = 'keep' | 'alt' | 'strip';

export type HeadingStyle = 'atx' | 'setext';
export type BulletMarker = '-' | '*' | '+';
export type CodeBlockStyle = 'fenced' | 'indented';

/** Các trường có thể xuất hiện trong YAML frontmatter. */
export type FrontmatterField =
  | 'title'
  | 'source'
  | 'author'
  | 'published'
  | 'captured'
  | 'description'
  | 'site'
  | 'tags';

export interface Settings {
  contentMode: ContentMode;
  imageMode: ImageMode;
  /** false: giữ chữ của link nhưng bỏ URL. */
  includeLinks: boolean;

  includeFrontmatter: boolean;
  /** Chèn "# Tiêu đề" đầu phần thân. */
  includeTitleHeading: boolean;
  frontmatterFields: FrontmatterField[];
  defaultTags: string[];

  filenameTemplate: string;
  downloadFolder: string;
  /** true: Chrome hỏi chỗ lưu mỗi lần tải. */
  askLocation: boolean;

  headingStyle: HeadingStyle;
  bulletMarker: BulletMarker;
  codeBlockStyle: CodeBlockStyle;
}

/** Tập con settings ảnh hưởng trực tiếp tới content script. */
export type ExtractOptions = Pick<
  Settings,
  'contentMode' | 'imageMode' | 'includeLinks' | 'headingStyle' | 'bulletMarker' | 'codeBlockStyle'
>;
