import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O app novo convive com o index.html atual em /forex-asrv/app/ (GitHub Pages).
  // Na Vercel (deploy na raiz) defina VITE_BASE=/ para gerar assets na raiz.
  base: process.env.VITE_BASE ?? '/forex-asrv/app/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
