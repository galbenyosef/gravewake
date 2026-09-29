// The PWA icons, rendered from the game itself: `npm run storybook` running, then `node scripts/icons.mjs`. Frames the
// Blightskull from the model viewer (its attack still, on the night background) and writes public/icon-192.png and
// public/icon-512.png. Needs ImageMagick (`magick`) for the square crop and resize.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:6006/iframe.html?id=models--blightskull&viewMode=story&args=still:!true');
await page.waitForTimeout(5000);
await page.screenshot({ path: 'public/icon-src.png', clip: { x: 140 - 120, y: 195 - 140, width: 250, height: 250 } });
await browser.close();
for (const n of [192, 512]) execFileSync('magick', ['public/icon-src.png', '-resize', `${n}x${n}`, `public/icon-${n}.png`]);
execFileSync('rm', ['public/icon-src.png']);
