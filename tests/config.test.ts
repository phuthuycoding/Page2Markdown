import { describe, expect, it } from 'bun:test';
import { DONATE_LABEL, DONATE_URL, shouldWelcome } from '../src/config';

describe('shouldWelcome — khi nào mở trang chào mừng', () => {
  it('cài mới (chưa có version cũ) thì luôn mở', () => {
    expect(shouldWelcome(undefined, '0.1.0')).toBe(true);
  });

  it('lên major thì mở', () => {
    expect(shouldWelcome('0.9.0', '1.0.0')).toBe(true);
  });

  it('lên minor thì mở', () => {
    expect(shouldWelcome('0.1.0', '0.2.0')).toBe(true);
  });

  it('chỉ vá patch thì im lặng — tự mở tab mỗi bản vá là cách nhanh nhất ăn một sao', () => {
    expect(shouldWelcome('0.1.0', '0.1.1')).toBe(false);
    expect(shouldWelcome('1.2.3', '1.2.9')).toBe(false);
  });

  it('cùng version thì không mở', () => {
    expect(shouldWelcome('0.1.0', '0.1.0')).toBe(false);
  });
});

describe('nút ủng hộ', () => {
  it('URL để rỗng thì nút phải tự ẩn — không để lại chỗ trống hay link chết', () => {
    expect(DONATE_URL).toBe('');
  });

  it('có chữ trên nút sẵn để lúc bật lên là dùng được ngay', () => {
    expect(DONATE_LABEL.length).toBeGreaterThan(0);
  });

  it('nếu đã cắm URL thì phải là https, không nhúng cổng thanh toán vào extension', () => {
    if (DONATE_URL) expect(DONATE_URL).toStartWith('https://');
  });
});
