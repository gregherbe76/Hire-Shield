import { chromium } from 'playwright';
import { mkdir, rename, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    const found = execSync('command -v chromium || command -v google-chrome || command -v chrome', {
      encoding: 'utf8',
    }).trim();
    if (found) return found;
  } catch {}
  return undefined;
}

const URL = process.env.DEMO_URL || 'http://localhost:25365/hireshield-demo/';
const OUT_DIR = path.resolve('artifacts/hireshield-demo/recordings');
const DURATION_MS = 45000;

await mkdir(OUT_DIR, { recursive: true });

const executablePath = resolveChromium();
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

page.on('console', (m) => console.log('[browser]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
console.log('Loaded page, recording for', DURATION_MS, 'ms');
await page.waitForTimeout(DURATION_MS);

await context.close();
await browser.close();

const files = await readdir(OUT_DIR);
const webm = files.find((f) => f.endsWith('.webm'));
if (webm) {
  const final = path.join(OUT_DIR, 'demo.webm');
  await rename(path.join(OUT_DIR, webm), final);
  console.log('Recorded:', final);
} else {
  console.error('No webm produced');
  process.exit(1);
}
