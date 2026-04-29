import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // listen on all interfaces so LAN devices can connect
    proxy: {
      '/api': {
        target: 'http://localhost:5238',
        changeOrigin: true,
      },
    },
  },
});
