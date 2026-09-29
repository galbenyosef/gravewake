import { defineConfig } from 'vite';

// main.ts awaits Pixi and the font at top level of boot; esnext keeps top-level await and modern syntax as written.
export default defineConfig({ build: { target: 'esnext' } });
