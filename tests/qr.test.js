// Encodes many payloads at every ECC level, dumps matrices for the Python/OpenCV decoder check.
const QR = require('../js/qr.js');
const fs = require('fs');
const known = [null,26,44,70,100,134,172,196,242,292,346];
let fails = 0;
for (let v = 1; v <= 10; v++) { const t = QR.totalCodewords(v); if (t !== known[v]) { console.log('codeword total mismatch v' + v, t, known[v]); fails++; } }
const payloads = ['A', 'https://voqcl.com', 'https://voqcl.com/#/live/voqcl/overlay/chat?user=voqcl', 'Héllo wörld ✓ 日本語', 'x'.repeat(100), 'https://example.com/' + 'a'.repeat(180), 'y'.repeat(250)];
const out = [];
for (const text of payloads) for (const ecc of ['L','M','Q','H']) {
  try { const r = QR.encode(text, ecc); out.push({ text, ecc, version: r.version, mask: r.mask, modules: r.modules.map(row => row.map(b => b ? 1 : 0)) }); }
  catch (e) { out.push({ text, ecc, error: e.message }); }
}
let tooLong = 0; try { QR.encode('z'.repeat(400), 'M'); } catch (e) { tooLong = /Too long/.test(e.message) ? 1 : 0; }
try { QR.encode('', 'M'); fails++; } catch (e) {}
fs.writeFileSync('/tmp/qr-cases.json', JSON.stringify(out));
console.log('cases', out.length, 'errors', out.filter(o => o.error).length, 'tooLongErrorOK', tooLong, 'selfCheckFails', fails);
process.exit(fails || !tooLong ? 1 : 0);
