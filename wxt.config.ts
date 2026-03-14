import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'OctoGrab',
    permissions: ['sidePanel', 'activeTab', 'scripting', 'storage', 'alarms'],
    action: {},
    icons: {
      16: '/octograb-logo.png',
      32: '/octograb-logo.png',
      48: '/octograb-logo.png',
      128: '/octograb-logo.png',
    },
  },
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      sourcemap: false, // Disable source maps in production
      minify: 'terser',
    },
  }),
});
