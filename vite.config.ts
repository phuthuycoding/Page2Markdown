import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      // Editor mở bằng chrome.tabs.create nên không được manifest tham chiếu;
      // phải khai báo ở đây thì Vite mới build ra.
      input: {
        editor: resolve(__dirname, 'src/editor/editor.html'),
      },
    },
  },
});
