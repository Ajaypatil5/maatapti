// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static', // ← REQUIRED
  vite: {
    plugins: [tailwindcss()],
  },
});
