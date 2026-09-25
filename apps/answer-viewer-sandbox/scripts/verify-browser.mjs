import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173';
const token = 'browser-verification-token';
const resolvedAnswer = {
  answerKey: 'ticket-browser',
  ticketId: 'ticket-browser',
  title: 'ဝန်ထမ်း ခွင့်တောင်းဆိုမှု',
  status: 'resolved',
  finalAnswer: '# အတည်ပြုပြီးသော အဖြေ\n\nဝန်ထမ်း၏ ခွင့်တောင်းဆိုမှုကို HR policy နှင့်ညီအောင် စစ်ဆေးပြီး အတည်ပြုနိုင်ပါသည်။\n\n| အဆင့် | လုပ်ဆောင်ချက် |\n|---|---|\n| ၁ | Request စစ်ဆေးရန် |\n| ၂ | Consultant approval မှတ်တမ်းတင်ရန် |',
  artifacts: [
    { type: 'sop', title: 'အလွန်ရှည်လျားသော Leave Management Standard Operating Procedure Diagram '.repeat(3), url: 'https://example.com/leave.drawio' },
    { type: 'file', title: 'Unsafe attachment', url: 'javascript:alert(1)' },
  ],
  reviewedBy: 'HR Consultant',
  reviewedAt: '2026-09-25T08:00:00.000Z',
  updatedAt: '2026-09-25T08:10:00.000Z',
};
const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
];

await mkdir('browser-evidence', { recursive: true });
const browser = await chromium.launch({ headless: true });

async function installApiRoute(page, mode = 'success') {
  await page.route(/\/api\/answer-viewer\/.+$/, async route => {
    if (mode === 'success') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        body: JSON.stringify(resolvedAnswer),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        body: JSON.stringify({ error: 'answer_unavailable' }),
      });
    }
  });
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error)));
    await installApiRoute(page);

    const apiResponse = page.waitForResponse(response => response.url().includes('/api/answer-viewer/'));
    await page.goto(`${base}/answer/${token}`, { waitUntil: 'domcontentloaded' });
    const intercepted = await apiResponse;
    if (intercepted.status() !== 200) throw new Error(`mocked authorized API returned ${intercepted.status()} at ${viewport.name}`);
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Answer'), null, { timeout: 5000 });
    await page.evaluate(() => document.fonts.ready);
    const bodyText = await page.locator('body').innerText();
    if (!bodyText.includes("HR Consultant's Answer")) throw new Error(`resolved answer missing at ${viewport.name}; DOM=${bodyText.slice(0,400)}`);
    if (!bodyText.includes('ဝန်ထမ်း၏ ခွင့်တောင်းဆိုမှု')) throw new Error(`Burmese content missing at ${viewport.name}`);
    if (bodyText.includes('Sheet_AI_Answer') || bodyText.includes('Consultant_Answer')) throw new Error('forbidden internal field leaked into DOM');
    if (await page.locator('a[href^="javascript:"]').count() > 0) throw new Error('javascript URL rendered');
    if (await page.getByRole('link', { name: 'Open Attachment' }).count() > 0) throw new Error('unsafe artifact became actionable');
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error(`horizontal overflow at ${viewport.name}`);
    if (pageErrors.length) throw new Error(`page errors at ${viewport.name}: ${pageErrors.join('; ')}`);
    await page.screenshot({ path: `browser-evidence/authorized-${viewport.name}.png`, fullPage: true });
    await page.close();
  }

  const denied = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installApiRoute(denied, 'denied');
  const deniedApiResponse = denied.waitForResponse(response => response.url().includes('/api/answer-viewer/'));
  await denied.goto(`${base}/answer/tampered-or-expired-token`, { waitUntil: 'domcontentloaded' });
  const deniedIntercepted = await deniedApiResponse;
  if (deniedIntercepted.status() !== 404) throw new Error(`mocked denied API returned ${deniedIntercepted.status()}`);
  await denied.waitForFunction(() => !document.body.innerText.includes('Loading Answer'), null, { timeout: 5000 });
  const deniedText = await denied.locator('body').innerText();
  if (!deniedText.includes('Answer Unavailable')) throw new Error('denied state missing');
  if (deniedText.includes('ticket-browser') || deniedText.includes('အတည်ပြုပြီးသော အဖြေ')) throw new Error('denied state leaked approved answer data');
  await denied.screenshot({ path: 'browser-evidence/denied-390.png', fullPage: true });
  await denied.close();

  console.log('Browser verification passed for 375, 390, 414, 768, 1280 widths plus authorized/denied and artifact security states.');
} finally {
  await browser.close();
}
