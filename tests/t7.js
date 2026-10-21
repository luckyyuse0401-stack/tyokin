const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], permissions: ['clipboard-read','clipboard-write'] }); await require('./fontroute.js')(c); const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); return p; };
  const A = await mk();
  await A.goto('http://localhost:8765/');
  await A.fill('[data-name]', '自分'); await A.fill('[data-bal]', '100000'); await A.click('[data-pin]'); await A.click('[data-start]');
  for (const k of '12341234') await A.click(`.sheet .pinpad [data-k="${k}"]`); await A.waitForTimeout(400); await A.click('[data-ob-next]'); await A.click('[data-ob-next]'); await A.waitForTimeout(300); await A.click('.sheet [data-later]');
  await A.waitForTimeout(300);
  await A.evaluate(() => { for (let i=0;i<300;i++) D.tx.push({id:uid(),date:'2026-0'+(4+i%6)+'-1'+(i%9),kind:'expense',amount:300+i,cat:'cafe',memo:'メモ'+i}); save(); render(); });
  const bal = await A.evaluate(() => balance());
  // QR
  await A.click('#tabbar [data-view="settings"]'); await A.click('[data-act="transfer-qr"]');
  for (const k of '1234') await A.click(`.sheet .pinpad [data-k="${k}"]`);
  await A.waitForSelector('.qrbox svg', { timeout: 15000 });
  console.log('qr note:', await A.textContent('.sheet .note'));
  const png = await (await A.$('.qrbox')).screenshot();
  await A.screenshot({ path: __dirname + '/t7-qr.png' });
  // B decodes QR image with jsQR, imports
  const B = await mk();
  await B.goto('http://localhost:8765/');
  await B.addScriptTag({ url: 'http://localhost:8765/vendor/jsQR.js' });
  const txt = await B.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img,0,0); const r = jsQR(x.getImageData(0,0,c.width,c.height).data, c.width, c.height); return r && r.data; }, png.toString('base64'));
  console.log('decoded prefix:', txt && txt.slice(0, 12), 'len', txt && txt.length);
  await B.evaluate(t => importCode(extractCode(t)), txt);
  for (const k of '1234') await B.click(`.pinpad [data-k="${k}"]`);
  await B.waitForSelector('[data-ok]'); await B.click('[data-ok]'); await B.waitForTimeout(300);
  for (const k of '1234') { if (await B.$('.pinpad')) await B.click(`.pinpad [data-k="${k}"]`); }
  await B.waitForTimeout(300);
  console.log('B balance', await B.evaluate(() => balance()), 'A balance', bal);
  // copy/paste flow
  await A.click('.sheet [data-close]'); await A.click('[data-act="transfer-copy"]');
  for (const k of '1234') await A.click(`.sheet .pinpad [data-k="${k}"]`);
  await A.waitForSelector('.sheet [data-close]');
  const clip = await A.evaluate(() => navigator.clipboard.readText());
  const C = await mk(); await C.goto('http://localhost:8765/');
  await C.evaluate(t => navigator.clipboard.writeText(t), clip);
  await C.screenshot({ path: __dirname + '/t7-welcome.png' });
  await C.click('[data-paste]');
  for (const k of '1234') await C.click(`.pinpad [data-k="${k}"]`);
  await C.waitForSelector('[data-ok]'); await C.click('[data-ok]'); await C.waitForTimeout(300);
  console.log('C balance', await C.evaluate(() => balance()));
  // snapshots
  await A.click('.sheet [data-close]');
  await A.evaluate(() => { const s = getSnaps(); s.push({date:'2026-10-10', data: {...JSON.parse(JSON.stringify(D)), tx: D.tx.slice(0,5)}}); store.set(`snap:${P.id}`, s); render(); });
  await A.evaluate(() => document.querySelector('.snap').scrollIntoView());
  await A.screenshot({ path: __dirname + '/t7-snap.png' });
  await A.click('.snap [data-i="1"]'); await A.click('.sheet [data-ok]');
  console.log('after restore tx', await A.evaluate(() => D.tx.length), 'snaps', await A.evaluate(() => getSnaps().map(s=>s.date+(s.before?'*':'')).join(',')));
  await b.close();
})();
