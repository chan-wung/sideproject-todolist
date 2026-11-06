import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Playwright 명세(e2e/*.spec.ts)는 npm run e2e로 따로 돌린다
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
