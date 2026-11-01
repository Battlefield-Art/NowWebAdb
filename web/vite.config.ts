import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const https = process.env.ADB_DEV_HTTPS === '1';

const REACT_PACKAGES = new Set([
  'react',
  'react-dom',
  'scheduler',
  'react-router',
  'react-router-dom',
  '@remix-run/router',
]);
const UI_PACKAGES = new Set(['clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react', 'sonner']);
// Only reachable from the lazily loaded home page, so they must stay out of the eager `adb` chunk.
const DEFERRED_YUME_PACKAGES = new Set(['@yume-chan/adb-daemon-webusb', '@yume-chan/adb-credential-web']);

function packageOf(id: string): string | undefined {
  if (id.includes('\0')) return undefined;
  const path = id.replace(/\\/g, '/');
  const match = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(path);
  return match?.[1];
}

function vendorChunk(id: string): string | undefined {
  const pkg = packageOf(id);
  if (!pkg) return undefined;
  if (REACT_PACKAGES.has(pkg)) return 'react';
  if (UI_PACKAGES.has(pkg) || pkg.startsWith('@radix-ui/')) return 'ui';
  if (pkg.startsWith('@yume-chan/') && !DEFERRED_YUME_PACKAGES.has(pkg)) return 'adb';
  // Everything else keeps Rollup's default boundaries, so genuinely lazy
  // dependencies (@zip.js, @xterm/*, @tanstack/react-virtual) stay lazy.
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(https ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // The mirror pane is mounted in the shell on every connected page, so its
        // whole @yume-chan stack is in the entry graph; naming the eager vendor
        // groups keeps each chunk below the 500 kB advisory and cacheable.
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/adb-bridge': { target: 'http://127.0.0.1:5858', ws: true, changeOrigin: true },
    },
  },
});
