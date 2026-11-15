import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Ảnh chia sẻ (og:image) cần địa chỉ tuyệt đối. Vercel tự cung cấp VERCEL_PROJECT_PRODUCTION_URL lúc build.
// Có thể đặt SITE_URL (VD https://a1league.vercel.app) trong Environment Variables để ghi đè.
function siteUrlPlugin() {
  const raw = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
  const siteUrl = raw ? (raw.startsWith('http') ? raw : `https://${raw}`).replace(/\/+$/, '') : '';
  return {
    name: 'inject-site-url',
    transformIndexHtml(html: string) {
      return html.replace(/__SITE_URL__/g, siteUrl);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteUrlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
