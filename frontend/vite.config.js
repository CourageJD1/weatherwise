import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-only: forward /api/* to the Express backend so the frontend can
    // use same-origin relative URLs (no CORS, no hardcoded backend origin).
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
