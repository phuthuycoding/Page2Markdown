/**
 * Đóng gói dist thành zip nộp Chrome Web Store.
 * Bỏ sourcemap: chúng chỉ làm nặng gói và lộ đường dẫn máy dev, người dùng
 * không cần tới.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'store');

if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
  console.error('Chưa có bản build. Chạy "bun run build" trước.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
const zipPath = path.join(OUT_DIR, `page2markdown-${manifest.version}.zip`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(zipPath, { force: true });

execFileSync('zip', ['-r', '-FS', '-q', zipPath, '.', '-x', '*.map', '-x', '.DS_Store'], {
  cwd: DIST,
  stdio: 'inherit',
});

const listed = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

console.log(
  `${path.relative(ROOT, zipPath)} — ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB`
);
console.log(`${listed.length} file:`);
for (const entry of listed) console.log(`  ${entry}`);
