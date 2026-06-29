import { defineConfig } from 'vite';

export default defineConfig({
  base: './' // Force relative asset paths so it runs correctly on GitHub Pages subdirectories
});
