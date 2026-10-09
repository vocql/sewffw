const OVC = require('../js/overlay-core.js');
const assert = require('assert');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const types = Object.keys(OVC.OVERLAYS);
ok(types.length === 7, 'expected 7 overlays, got ' + types.length);
const hashOf = u => '#' + u.split('#')[1];

// Exact examples from the spec
ok(OVC.buildUrl('chat', { user: 'voqcl' }) === 'https://voqcl.com/#/live/voqcl/overlay/chat?user=voqcl', 'chat example URL');
ok(OVC.buildUrl('followtracker', { user: 'voqcl' }) === 'https://voqcl.com/#/live/voqcl/overlay/followtracker?user=voqcl', 'followtracker example URL');

for (const t of types) {
  const def = OVC.defaults(t);
  const u = OVC.buildUrl(t, { ...def });
  ok(u.startsWith(`https://voqcl.com/#/live/voqcl/overlay/${t}?user=`), t + ' path');
  ok(!/chatis\.is2511/.test(u), t + ' must not use chatis');
  const p = OVC.parseHash(hashOf(u));
  ok(p.ok && p.type === t && p.channel === 'voqcl' && p.values.user === 'voqcl' && !p.bad.length, t + ' default roundtrip');
  // change every field to a non-default valid value and verify the roundtrip preserves it
  const changed = {};
  for (const f of OVC.OVERLAYS[t].fields) {
    if (f.type === 'bool') changed[f.k] = !f.def;
    else if (f.type === 'number') changed[f.k] = f.def === f.max ? f.min : Math.min(f.max, Math.max(f.min, f.def + 1));
    else if (f.type === 'select') changed[f.k] = Object.keys(f.opts).find(k => k !== f.def);
    else if (f.type === 'color') changed[f.k] = f.def === 'ff0000' ? '00ff00' : 'ff0000';
    else changed[f.k] = f.k === 'user' ? 'MyUser_01' : 'a b&c=d|é ✓';
  }
  const u2 = OVC.buildUrl(t, changed, { domain: 'https://example.org/', channel: 'MyChan' });
  ok(u2.startsWith(`https://example.org/#/live/MyChan/overlay/${t}?`), t + ' custom domain/channel');
  const p2 = OVC.parseHash(hashOf(u2));
  ok(p2.ok && p2.channel === 'mychan', t + ' channel lowercased');
  for (const f of OVC.OVERLAYS[t].fields) ok(p2.values[f.k] === changed[f.k], `${t}.${f.k} preserved (${JSON.stringify(p2.values[f.k])} vs ${JSON.stringify(changed[f.k])})`);
  ok(!p2.bad.length, t + ' no bad params');
}
// invalid input handling
ok(!OVC.parseHash('#/live/voqcl/overlay/cs2?user=x').ok, 'cs2 overlay is gone');
ok(!OVC.parseHash('#/live/voqcl/overlay/chatis').ok, 'chatis overlay is gone');
ok(!OVC.parseHash('#/live/voqcl').ok && !OVC.parseHash('#/live/ab/overlay/chat').ok && !OVC.parseHash('#/tool/chat').ok, 'bad addresses rejected');
ok(OVC.parseHash('#/live/voqcl/overlay').type === 'followtracker', 'legacy bare overlay path maps to follower tracker');
const bad = OVC.parseHash('#/live/voqcl/overlay/chat?user=voqcl&size=9999&platform=kick&avatars=maybe&color=zzz');
ok(bad.ok && bad.values.size === 56 && bad.values.platform === 'twitch' && bad.values.avatars === true && bad.values.color === 'ffffff' && bad.bad.length === 4, 'bad params clamped/defaulted and reported');
ok(OVC.parseHash('#/live/voqcl/overlay/chat').values.user === 'voqcl', 'missing user falls back to channel');
assert.throws(() => OVC.buildUrl('chat', {}, { domain: 'javascript:alert(1)' }), /Domain/); n++;
assert.throws(() => OVC.buildUrl('chat', {}, { channel: 'a b' }), /channel/); n++;
assert.throws(() => OVC.buildUrl('cs2', {}), /Unknown/); n++;
ok(OVC.buildUrl('chat', { user: 'x' }, { domain: 'https://nick.github.io/voqcl-tools/' }) === 'https://nick.github.io/voqcl-tools/#/live/voqcl/overlay/chat?user=x', 'project-page sub-path domain supported');
console.log(`overlay-urls: ${n} assertions passed across ${types.length} overlays`);
