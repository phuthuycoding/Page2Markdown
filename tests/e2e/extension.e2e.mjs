/**
 * Kiểm thử extension đã build trong một Chrome thật: manifest hợp lệ, service
 * worker sống, options ghi được storage, downloads nhận data URL, popup dựng UI.
 *
 * Chạy: bun run build && bun run test:e2e
 *
 * Phần KHÔNG tự động hoá được ở đây: luồng inject content script. Extension chỉ
 * xin activeTab, mà quyền đó chỉ được Chrome cấp khi người dùng thật sự bấm icon
 * / phím tắt / menu chuột phải — không có cách hợp lệ nào giả lập cử chỉ đó từ
 * ngoài. Nội dung trích xuất được phủ bằng tests/extract.test.ts (jsdom).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');

/** Tìm một Chrome dùng được: bản Playwright tải về, rồi mới đến Chrome hệ thống. */
function findChrome() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (fs.existsSync(cache)) {
    const builds = fs
      .readdirSync(cache)
      .filter((name) => name.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const build of builds) {
      for (const arch of ['chrome-mac-arm64', 'chrome-mac']) {
        for (const app of ['Google Chrome for Testing', 'Chromium']) {
          const candidate = path.join(cache, build, arch, `${app}.app/Contents/MacOS/${app}`);
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  }

  const system = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(system)) return system;

  throw new Error('Không tìm thấy Chrome. Chạy: bunx playwright install chromium');
}

const results = [];
function check(name, pass, extra = '') {
  results.push([name, pass]);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : `\n      → ${extra}`}`);
}

if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
  console.error('Chưa có bản build. Chạy "bun run build" trước.');
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'p2m-profile-'));
const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'p2m-dl-'));

const context = await chromium.launchPersistentContext(profile, {
  executablePath: findChrome(),
  headless: false,
  downloadsPath: downloads,
  args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--no-first-run'],
});

try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
  const extensionId = new URL(worker.url()).host;
  check('extension load, service worker khởi động không lỗi', Boolean(extensionId), worker.url());

  const workerErrors = [];
  worker.on('console', (message) => {
    if (message.type() === 'error') workerErrors.push(message.text());
  });

  // contextMenus.update chỉ chạy lọt nếu id đó thật sự đã được tạo lúc cài đặt.
  // onInstalled chạy bất đồng bộ với lúc service worker sẵn sàng nên phải chờ.
  const menus = await worker.evaluate(async () => {
    const probe = (id) =>
      new Promise((resolve) => {
        chrome.contextMenus.update(id, {}, () =>
          resolve(chrome.runtime.lastError ? chrome.runtime.lastError.message : true)
        );
      });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await probe('p2m-capture')) === true) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { capture: await probe('p2m-capture'), bogus: await probe('p2m-khong-ton-tai') };
  });
  check('menu "Save Page To Markdown" được tạo', menus.capture === true, String(menus.capture));
  check(
    'phép thử ngược: id không tồn tại thì báo lỗi',
    typeof menus.bogus === 'string',
    String(menus.bogus)
  );

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);

  const script = await page.evaluate(async () => {
    const response = await fetch(chrome.runtime.getURL('src/content/extractor.js'));
    return { status: response.status, size: (await response.text()).length };
  });
  check(
    'content script nằm đúng đường dẫn sẽ được inject',
    script.status === 200 && script.size > 10000,
    JSON.stringify(script)
  );

  // Đường dẫn nhúng trong bundle phải khớp file thật, lệch là inject chết lúc chạy.
  const bundles = fs
    .readdirSync(path.join(DIST, 'assets'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(DIST, 'assets', name), 'utf8'));
  check(
    'code inject trỏ đúng tên file content script đã build',
    bundles.some((code) => code.includes('"src/content/extractor.js"')),
    'không thấy đường dẫn nào trong dist/assets'
  );

  check(
    'options render đủ 8 chip frontmatter',
    (await page.locator('#frontmatterFields .chip').count()) === 8
  );

  await page.selectOption('#imageMode', 'strip');
  await page.fill('#filenameTemplate', '{domain}/{slug}');
  await page.dispatchEvent('#filenameTemplate', 'change');
  await page.waitForTimeout(500);

  const stored = await page.evaluate(
    async () => (await chrome.storage.sync.get('p2m_settings')).p2m_settings
  );
  check(
    'đổi option ghi vào chrome.storage.sync',
    stored?.imageMode === 'strip',
    String(stored?.imageMode)
  );
  check(
    'sửa mẫu tên file được lưu lại',
    stored?.filenameTemplate === '{domain}/{slug}',
    String(stored?.filenameTemplate)
  );

  await page.reload();
  await page.waitForSelector('#frontmatterFields .chip');
  check(
    'mở lại options thấy đúng giá trị đã lưu',
    (await page.inputValue('#imageMode')) === 'strip'
  );

  await page.click('#reset');
  await page.waitForTimeout(500);
  const afterReset = await page.evaluate(
    async () => (await chrome.storage.sync.get('p2m_settings')).p2m_settings?.imageMode
  );
  check('nút "về mặc định" khôi phục đúng', afterReset === 'keep', String(afterReset));

  const saved = await page.evaluate(async () => {
    const text =
      '---\ntitle: "Bài kiểm thử"\n---\n\n# Bài kiểm thử\n\nNội dung tiếng Việt có dấu.\n';
    try {
      const id = await chrome.downloads.download({
        url: `data:text/markdown;charset=utf-8,${encodeURIComponent(text)}`,
        filename: 'Page2Markdown/p2m-e2e-kiem-thu.md',
        saveAs: false,
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
      const [item] = await chrome.downloads.search({ id });
      return { ok: true, path: item?.filename, state: item?.state };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  check('chrome.downloads nhận data URL markdown', saved.ok, saved.error);
  check('tải xong, không bị huỷ giữa chừng', saved.state === 'complete', String(saved.state));

  // Không kiểm thư mục con ở đây: Playwright chiếm quyền đặt tên cho mọi
  // download nên path trả về là tên tạm của nó. Phần dựng đường dẫn đã có
  // unit test riêng trong tests/filename.test.ts.
  if (saved.path && fs.existsSync(saved.path)) {
    const content = fs.readFileSync(saved.path, 'utf8');
    check('file giữ nguyên tiếng Việt có dấu', content.includes('Nội dung tiếng Việt có dấu'));
    fs.rmSync(saved.path, { force: true });
  } else {
    check('file .md có thật trên đĩa', false, String(saved.path));
  }

  // Editor mở không kèm draft phải báo rõ, không được để trang trắng.
  const editorEmpty = await context.newPage();
  await editorEmpty.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await editorEmpty.waitForSelector('#stateError:not(.hidden)', { timeout: 10000 });
  const emptyMessage = (await editorEmpty.textContent('#errorMessage')) ?? '';
  check(
    'editor không có draft thì báo lỗi có nội dung',
    emptyMessage.trim().length > 0,
    emptyMessage
  );

  // Nạp một draft đúng như background vẫn làm, rồi mở editor bằng id đó.
  const draftId = await page.evaluate(async () => {
    const id = crypto.randomUUID();
    await chrome.storage.local.set({
      [`p2m_draft_${id}`]: {
        id,
        createdAt: Date.now(),
        payload: {
          source: 'readability',
          meta: {
            url: 'https://example.com/post',
            domain: 'example.com',
            title: 'End to end sample',
            author: 'Jane Cooper',
            publishedTime: '',
            excerpt: '',
            siteName: 'Example',
          },
          markdown: '## Heading\n\nSome **body** text.\n\n- one\n- two',
          stats: { words: 6, images: 0, links: 0, chars: 44 },
        },
      },
    });
    return id;
  });

  const editor = await context.newPage();
  await editor.goto(`chrome-extension://${extensionId}/src/editor/editor.html?draft=${draftId}`);
  await editor.waitForSelector('#stateReady:not(.hidden)', { timeout: 10000 });

  check(
    'editor dựng được nội dung từ draft',
    (await editor.inputValue('#title')) === 'End to end sample'
  );
  const loaded = await editor.inputValue('#markdown');
  check(
    'markdown gồm frontmatter và thân bài',
    loaded.startsWith('---\n') && loaded.includes('Some **body** text.'),
    loaded.slice(0, 120)
  );
  check(
    'tên file suy ra từ tiêu đề',
    (await editor.textContent('#filename'))?.includes('end-to-end-sample') === true,
    await editor.textContent('#filename')
  );

  // Toolbar phải sửa thật vào ô soạn thảo
  await editor.evaluate(() => {
    const area = document.getElementById('markdown');
    const at = area.value.indexOf('body');
    area.setSelectionRange(at, at + 4);
    area.focus();
  });
  await editor.click('.toolbar button[data-command="italic"]');
  check(
    'nút italic chèn đúng dấu vào ô soạn thảo',
    (await editor.inputValue('#markdown')).includes('_body_')
  );

  // Preview chạy trong iframe sandbox, phải render ra HTML thật
  const previewHeading = await editor.frameLocator('#preview').locator('h2').first().textContent();
  check(
    'preview render markdown thành HTML',
    previewHeading?.trim() === 'Heading',
    String(previewHeading)
  );

  const credits = await editor.evaluate(() => {
    const root = document.getElementById('credits');
    return {
      text: root?.textContent ?? '',
      links: [...(root?.querySelectorAll('a') ?? [])].map((a) => ({
        href: a.href,
        rel: a.rel,
        target: a.target,
      })),
    };
  });
  check(
    'chân editor có credit tác giả',
    credits.text.includes('Made by phuthuycoding'),
    credits.text
  );
  check(
    'có lời mời star kèm link repo',
    credits.links.some((l) => l.href.includes('github.com/phuthuycoding/Page2Markdown')),
    JSON.stringify(credits.links)
  );
  check('lời mời star đọc ra là star', credits.text.includes('star it on GitHub'), credits.text);
  check(
    'mọi link credit mở tab mới và có rel noopener',
    credits.links.length > 0 &&
      credits.links.every((l) => l.target === '_blank' && l.rel.includes('noopener')),
    JSON.stringify(credits.links)
  );
  // DONATE_URL đang rỗng nên không được có link ủng hộ nào lòi ra.
  check(
    'chưa cắm DONATE_URL thì không hiện nút ủng hộ',
    !credits.text.includes('coffee'),
    credits.text
  );

  // Bấm đúng nút save và kiểm tới cùng: chrome.downloads.download() trả id ngay
  // khi nhận lệnh, nên nếu chỉ tin vào id thì file rỗng vẫn báo thành công.
  await editor.click('#download');
  await editor.waitForTimeout(2500);
  const saveToast = (await editor.textContent('#toast')) ?? '';
  check('bấm save báo đã lưu, không phải lỗi', saveToast.startsWith('Saved'), saveToast);

  const downloadState = await page.evaluate(async () => {
    const [item] = await chrome.downloads.search({ limit: 1, orderBy: ['-startTime'] });
    return {
      state: item?.state,
      bytes: item?.bytesReceived,
      error: item?.error,
      path: item?.filename,
    };
  });
  check(
    'download chạy tới trạng thái complete',
    downloadState.state === 'complete',
    JSON.stringify(downloadState)
  );
  check(
    'file có nội dung thật, không phải 0 byte',
    (downloadState.bytes ?? 0) > 0,
    JSON.stringify(downloadState)
  );

  if (downloadState.path && fs.existsSync(downloadState.path)) {
    const written = fs.readFileSync(downloadState.path, 'utf8');
    // Nút italic ở bước trên đã sửa "body" thành "_body_": file phải mang đúng
    // bản đã sửa, không phải bản gốc lúc capture.
    check(
      'file lưu đúng bản đã sửa tay, không phải bản gốc',
      written.includes('_body_'),
      written.slice(0, 200)
    );
    fs.rmSync(downloadState.path, { force: true });
  } else {
    check('file save từ editor có thật trên đĩa', false, String(downloadState.path));
  }

  // Tắt preview thì chuyển về một cột
  await editor.uncheck('#showPreview');
  check(
    'tắt preview thì chuyển sang một cột',
    await editor.evaluate(() => document.getElementById('panes').classList.contains('single'))
  );

  check(
    'service worker không ném lỗi nào suốt phiên',
    workerErrors.length === 0,
    workerErrors.join(' | ')
  );
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
  fs.rmSync(downloads, { recursive: true, force: true });
}

const failed = results.filter(([, pass]) => !pass).length;
console.log(`\n${results.length - failed}/${results.length} pass`);
process.exit(failed > 0 ? 1 : 0);
