// テスト用：Googleフォントの取得をcurl経由に差し替える（ブラウザから直接プロキシを使えないため）
const { execFileSync } = require('child_process');
const cache = new Map();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
module.exports = async ctx => {
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
    const url = route.request().url();
    if (!cache.has(url)) cache.set(url, execFileSync('curl', ['-sS', '-A', UA, url], { maxBuffer: 1 << 26 }));
    const body = cache.get(url);
    await route.fulfill({ body, headers: { 'content-type': url.includes('googleapis') ? 'text/css' : 'font/woff2', 'access-control-allow-origin': '*' } });
  });
};
