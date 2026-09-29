import { defineConfig } from 'vite';

// main.ts awaits Pixi and the font at top level of boot; esnext keeps top-level await and modern syntax as written.
// base './': asset URLs are relative, so the build also runs from a subfolder (itch.io serves games from one).
export default defineConfig({ base: './', build: { target: 'esnext' } });
