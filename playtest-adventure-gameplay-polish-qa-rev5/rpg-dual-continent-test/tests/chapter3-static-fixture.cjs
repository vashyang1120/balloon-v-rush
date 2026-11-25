'use strict';
const { readFile } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');

const root = resolve(__dirname, '../..');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

async function serveCheckout(route, origin, stripPath = '', headers = {}) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
  const pathname = decodeURIComponent(url.pathname);
  if (stripPath && !pathname.startsWith(stripPath)) return route.abort();
  const file = resolve(root, '.' + pathname.slice(stripPath.length), pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + sep)) return route.abort();
  let body;
  try { body = await readFile(file); } catch { return route.fulfill({ status: 404 }); }
  const contentType = mime[extname(file)] || 'application/octet-stream';
  const range = request.headers().range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const first = Number(range[1]);
    const last = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    if (first > last) return route.fulfill({ status: 416 });
    return route.fulfill({ status: 206, contentType, headers: {
      ...headers, 'content-range': `bytes ${first}-${last}/${body.length}`, 'accept-ranges': 'bytes',
    }, body: body.subarray(first, last + 1) });
  }
  return route.fulfill({ contentType, headers, body: request.method() === 'HEAD' ? Buffer.alloc(0) : body });
}

async function openHostedAdventure(page, url) {
  const failed = new Set();
  const responseFailed = response => {
    if (response.status() >= 400) failed.add(response.status() + ' ' + response.url());
  };
  const requestFailed = request => failed.add(request.failure()?.errorText + ' ' + request.url());
  page.on('response', responseFailed);
  page.on('requestfailed', requestFailed);
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    if (!response?.ok()) throw new Error('Hosted document: HTTP ' + response?.status());
    const open = page.getByRole('button', { name: 'Open the page', exact: true })
      .or(page.getByRole('link', { name: 'Open the page', exact: true }));
    if (await open.isVisible()) await open.click();
    await page.locator('#btn-start-gate-go').waitFor({ timeout: 50000 });
  } catch (error) {
    const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    throw new Error(error.message + '\nHosted URL: ' + page.url() + '\nPage: ' + text.slice(0, 1600) +
      '\nFailed requests: ' + [...failed].slice(0, 24).join('\n'), { cause: error });
  } finally {
    page.off('response', responseFailed);
    page.off('requestfailed', requestFailed);
  }
}

module.exports = { serveCheckout, openHostedAdventure };
