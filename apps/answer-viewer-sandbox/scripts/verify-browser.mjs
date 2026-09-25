import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173';
const keys = {
  resolved: 'phr_sbx_a4f19c82d7e641b39a60c52e',
  multiple: 'phr_sbx_c62e9f85a0b341d2bc84e731',
  pending: 'phr_sbx_d73fa096b1c452e3cd95f842',
  expired: 'phr_sbx_e840b1a7c2d563f4de06a953',
  structured: 'phr_sbx_f951c2b8d3e674a5ef17ba64',
  malicious: 'phr_sbx_0a62d3c9e4f785b6fa28cb75',
  missingFinal: 'phr_sbx_1b73e4daf50696c70b39dc86',
  unknown: 'phr_sbx_000000000000000000000000',
};
const viewports = [
  { name: '320', width: 320, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
];

await mkdir('browser-evidence', { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error)));

    await page.goto(`${base}/answer/${keys.resolved}`, { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    await page.evaluate(() => document.fonts.ready);
    const myanmarFontLoaded = await page.evaluate(() => document.fonts.check('16px "Noto Sans Myanmar"'));
    if (!myanmarFontLoaded) throw new Error(`Myanmar webfont not loaded at ${viewport.name}`);
    if (!bodyText.includes("HR Consultant's Answer")) throw new Error(`resolved answer missing at ${viewport.name}`);
    if (!bodyText.includes('ဝန်ထမ်း၏ ခွင့်တောင်းဆိုမှု')) throw new Error(`Burmese content missing at ${viewport.name}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`horizontal overflow at ${viewport.name}`);
    if (pageErrors.length) throw new Error(`page errors at ${viewport.name}: ${pageErrors.join('; ')}`);
    await page.screenshot({ path: `browser-evidence/resolved-${viewport.name}.png`, fullPage: true });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${base}/answer/${keys.structured}`, { waitUntil: 'networkidle' });
  if (await page.locator('.table-scroll > table').count() !== 1) throw new Error('structured table is not wrapped for overflow safety');
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('structured page overflows at 390px');
  await page.screenshot({ path: 'browser-evidence/structured-390.png', fullPage: true });

  await page.goto(`${base}/answer/${keys.multiple}`, { waitUntil: 'networkidle' });
  if (await page.locator('a.artifact-action').count() !== 3) throw new Error('multiple artifact actions did not render');
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('multiple-artifact page overflows at 390px');
  await page.screenshot({ path: 'browser-evidence/multiple-390.png', fullPage: true });

  await page.goto(`${base}/answer/${keys.pending}`, { waitUntil: 'networkidle' });
  const pendingText = await page.locator('body').innerText();
  if (pendingText.includes('THIS MUST NEVER BE VISIBLE TO THE CLIENT')) throw new Error('pending final answer leaked');
  if (!pendingText.includes('Pending Review')) throw new Error('pending review state missing');

  await page.goto(`${base}/answer/${keys.expired}`, { waitUntil: 'networkidle' });
  const expiredText = await page.locator('body').innerText();
  if (expiredText.includes('EXPIRED CONTENT MUST NEVER BE VISIBLE')) throw new Error('expired final answer leaked');
  if (!expiredText.includes('Expired')) throw new Error('expired state missing');

  await page.goto(`${base}/answer/${keys.missingFinal}`, { waitUntil: 'networkidle' });
  const missingFinalText = await page.locator('body').innerText();
  if (!missingFinalText.includes('Answer Unavailable')) throw new Error('resolved answer with missing final content did not fail safely');
  if (missingFinalText.includes('Expired')) throw new Error('resolved answer with missing final content was mislabeled Expired');

  await page.goto(`${base}/answer/${keys.unknown}`, { waitUntil: 'networkidle' });
  if (!(await page.locator('body').innerText()).includes('Answer Not Found')) throw new Error('unknown key did not render Not Found');

  await page.goto(`${base}/answer/1`, { waitUntil: 'networkidle' });
  if (!(await page.locator('body').innerText()).includes('Invalid Answer Link')) throw new Error('invalid key did not fail safely');

  await page.goto(`${base}/answer/${keys.malicious}`, { waitUntil: 'networkidle' });
  const maliciousScriptCount = await page.locator('script').evaluateAll(nodes =>
    nodes.filter(node => (node.textContent ?? '').includes('alert("xss")') || (node.textContent ?? '').includes('alert(1)')).length,
  );
  if (maliciousScriptCount > 0) throw new Error('untrusted script payload rendered');
  if (await page.locator('img[src="x"]').count() > 0) throw new Error('untrusted image node rendered');
  if (await page.locator('a[href^="javascript:"]').count() > 0) throw new Error('javascript URL rendered');
  if (await page.getByRole('link', { name: 'Open Attachment' }).count() > 0) throw new Error('unsafe artifact became actionable');
  await page.screenshot({ path: 'browser-evidence/malicious-390.png', fullPage: true });
  await page.close();

  console.log('Browser verification passed for responsive widths plus structured, HITL, rendering-failure, and security states.');
} finally {
  await browser.close();
}
