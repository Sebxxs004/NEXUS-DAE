import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    allowedHosts: ['nexus.dae'],
    host: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'server/public'),
    emptyOutDir: true,
  },
});
