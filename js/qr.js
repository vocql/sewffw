/* Minimal QR Code encoder: byte mode (UTF-8), versions 1-10, error correction L/M/Q/H.
   encode(text, 'M') -> { size, version, ecc, mask, modules: boolean[][] } or throws Error with a user-readable message. */
(function (root) {
  /* per version, per ECC level: [ecCodewordsPerBlock, blocksGroup1, dataCwGroup1, blocksGroup2, dataCwGroup2] */
  const EC = {
    L: [null, [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69]],
    M: [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]],
    Q: [null, [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0], [18, 2, 15, 2, 16], [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20]],
    H: [null, [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0], [22, 2, 11, 2, 12], [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15], [24, 4, 12, 4, 13], [28, 6, 15, 2, 16]],
  };
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const ECC_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  const MAX_VERSION = 10;

  /* GF(256) */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

  function generator(deg) {
    let g = [1];
    for (let i = 0; i < deg; i++) {
      const n = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) { n[j] ^= g[j]; n[j + 1] ^= gmul(g[j], EXP[i]); }
      g = n;
    }
    return g;
  }
  function rsRemainder(data, deg) {
    const g = generator(deg), rem = new Array(deg).fill(0);
    for (const b of data) {
      const f = b ^ rem.shift();
      rem.push(0);
      if (f) for (let i = 0; i < deg; i++) rem[i] ^= gmul(g[i + 1], f);
    }
    return rem;
  }

  const sizeOf = v => 17 + 4 * v;
  const dataCapacity = (v, ecc) => { const e = EC[ecc][v]; return e[1] * e[2] + e[3] * e[4]; };

  function utf8(str) { return Array.from(new TextEncoder().encode(str)); }

  function buildData(bytes, version, ecc) {
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(0b0100, 4);
    push(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    const cap = dataCapacity(version, ecc) * 8;
    push(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; out.push(b); }
    for (let pad = 0xec; out.length < cap / 8; pad ^= 0xec ^ 0x11) out.push(pad);
    return out;
  }

  function interleave(data, version, ecc) {
    const [ecLen, b1, d1, b2, d2] = EC[ecc][version];
    const blocks = [];
    let pos = 0;
    for (let i = 0; i < b1 + b2; i++) {
      const len = i < b1 ? d1 : d2;
      const d = data.slice(pos, pos + len); pos += len;
      blocks.push({ d, e: rsRemainder(d, ecLen) });
    }
    const out = [];
    const maxD = Math.max(d1, d2);
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
    for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);
    return out;
  }

  function bch(value, poly, bitsLen, shift) {
    let v = value << shift;
    const top = (n) => 31 - Math.clz32(n);
    while (v && top(v) >= bitsLen) v ^= poly << (top(v) - bitsLen);
    return v;
  }
  const formatBits = (ecc, mask) => { const d = (ECC_BITS[ecc] << 3) | mask; return (((d << 10) | bch(d, 0x537, 10, 10)) ^ 0x5412); };
  const versionBits = v => (v << 12) | bch(v, 0x1f25, 12, 12);

  function makeMatrix(version) {
    const n = sizeOf(version);
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const fn = Array.from({ length: n }, () => new Array(n).fill(false)); // function-pattern map
    const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };

    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    const al = ALIGN[version];
    for (const cy of al) for (const cx of al) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === al[al.length - 1]) || (cx === al[al.length - 1] && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    set(8, n - 8, true); // dark module
    for (let i = 0; i < 9; i++) { if (!fn[8][i]) set(i, 8, false); if (!fn[i][8]) set(8, i, false); }
    for (let i = 0; i < 8; i++) { set(n - 1 - i, 8, false); set(8, n - 1 - i, false); }
    set(8, n - 8, true);
    if (version >= 7) {
      const vb = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = ((vb >> i) & 1) === 1, a = Math.floor(i / 3), b = (i % 3) + n - 11;
        set(a, b, bit); set(b, a, bit);
      }
    }
    return { m, fn, n };
  }

  function placeData(mat, codewords) {
    const { m, fn, n } = mat;
    let i = 0;
    const total = codewords.length * 8;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - v : v;
        if (!fn[y][x] && i < total) { m[y][x] = ((codewords[i >> 3] >> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function applyMask(mat, mask, ecc) {
    const { m, fn, n } = mat;
    const out = m.map((r, y) => r.map((v, x) => (!fn[y][x] && MASKS[mask](x, y) ? !v : v)));
    const fb = formatBits(ecc, mask);
    const bit = i => ((fb >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) out[i][8] = bit(i);
    out[7][8] = bit(6); out[8][8] = bit(7); out[8][7] = bit(8);
    for (let i = 9; i < 15; i++) out[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) out[8][n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) out[n - 15 + i][8] = bit(i);
    out[n - 8][8] = true;
    return out;
  }

  function penalty(q) {
    const n = q.length;
    let score = 0;
    const runs = line => {
      let s = 0, run = 1;
      for (let i = 1; i < n; i++) { if (line[i] === line[i - 1]) run++; else { if (run >= 5) s += run - 2; run = 1; } }
      if (run >= 5) s += run - 2;
      return s;
    };
    for (let y = 0; y < n; y++) score += runs(q[y]);
    for (let x = 0; x < n; x++) score += runs(q.map(r => r[x]));
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = q[y][x]; if (c === q[y][x + 1] && c === q[y + 1][x] && c === q[y + 1][x + 1]) score += 3; }
    const pat = [true, false, true, true, true, false, true, false, false, false, false], pat2 = pat.slice().reverse();
    const scan = get => { for (let a = 0; a < n; a++) for (let b = 0; b <= n - 11; b++) { let f1 = true, f2 = true; for (let k = 0; k < 11; k++) { const v = get(a, b + k); if (v !== pat[k]) f1 = false; if (v !== pat2[k]) f2 = false; if (!f1 && !f2) break; } if (f1) score += 40; if (f2) score += 40; } };
    scan((a, b) => q[a][b]); scan((a, b) => q[b][a]);
    let dark = 0; for (const r of q) for (const v of r) if (v) dark++;
    score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
    return score;
  }

  function maxBytes(ecc) {
    const v = MAX_VERSION;
    return dataCapacity(v, ecc) - 3; // 4-bit mode + 16-bit length = 20 bits -> 3 bytes overhead (rounded up)
  }

  function encode(text, ecc = 'M', forceMask) {
    if (!EC[ecc]) throw new Error('Unknown error-correction level.');
    const bytes = utf8(String(text));
    if (!bytes.length) throw new Error('Enter some text or a URL first.');
    let version = 0;
    for (let v = 1; v <= MAX_VERSION; v++) {
      const need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
      if (need <= dataCapacity(v, ecc) * 8) { version = v; break; }
    }
    if (!version) throw new Error(`Too long for this generator: ${bytes.length} bytes (max about ${maxBytes(ecc)} at level ${ecc}). Shorten the text or lower the error-correction level.`);
    const cw = interleave(buildData(bytes, version, ecc), version, ecc);
    const mat = makeMatrix(version);
    placeData(mat, cw);
    let best = null, bestMask = 0, bestScore = Infinity;
    for (let k = 0; k < 8; k++) {
      if (forceMask !== undefined && k !== forceMask) continue;
      const q = applyMask(mat, k, ecc), s = penalty(q);
      if (s < bestScore) { best = q; bestScore = s; bestMask = k; }
    }
    return { size: mat.n, version, ecc, mask: bestMask, modules: best, bytes: bytes.length };
  }

  /* total-codeword self check used by tests */
  function totalCodewords(v) { const e = EC.L[v]; return (e[1] + e[3]) * e[0] + e[1] * e[2] + e[3] * e[4]; }

  const api = { encode, EC, MAX_VERSION, maxBytes, dataCapacity, totalCodewords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QR = api;
})(typeof window !== 'undefined' ? window : globalThis);
