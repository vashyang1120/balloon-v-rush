'use strict';
const { createServer } = require('node:http');
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

const root = resolve(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4'
};

function createPreview(contentRoot = root) {
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(contentRoot, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
      if (!file.startsWith(contentRoot + sep)) throw Error('outside the checkout');
      const { size } = await stat(file);
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
      let start = 0, end = size - 1;
      if (range) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(end, Number(range[2]));
        if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }).end(); return; }
        headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + size;
      }
      headers['Content-Length'] = Math.max(0, end - start + 1);
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === 'HEAD' || size === 0) res.end();
      else createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8412);
  createPreview().listen(port, '127.0.0.1', () => {
    for (const dir of ['rpg-continent1-universe', 'rpg-dual-continent-test']) {
      console.log('http://127.0.0.1:' + port + '/' + dir + '/?guest=1&sandbox=1');
    }
  });
}
module.exports = { createPreview };
