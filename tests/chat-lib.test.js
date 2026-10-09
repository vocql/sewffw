const L = require('../js/chat-lib.js'); const assert = require('assert'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const line = '@badge-info=subscriber/8;badges=moderator/1,subscriber/6;color=#1E90FF;display-name=Cool\\sUser;emotes=25:0-4,12-16/1902:6-10;id=abc-123;room-id=12345;tmi-sent-ts=1700000000000;user-id=9 :cooluser!cooluser@cooluser.tmi.twitch.tv PRIVMSG #voqcl :Kappa Keepo Kappa :) done';
const irc = L.parseIrc(line); ok(irc.cmd === 'PRIVMSG' && irc.params[0] === '#voqcl' && irc.tags['display-name'] === 'Cool User', 'parse tags + escapes');
const m = L.twitchMessage(irc); ok(m && m.name === 'Cool User' && m.login === 'cooluser' && m.color === '#1E90FF' && m.mod && m.member && !m.owner && m.roomId === '12345' && m.ts === 1700000000000, 'normalized message');
const parts = L.messageParts('Kappa Keepo Kappa hi', '25:0-4,12-16/1902:6-10', null);
ok(parts.filter(p => p.t === 'emote').length === 3 && parts[0].url.includes('/25/') && parts[2].url.includes('/1902/'), 'twitch emotes placed');
// codepoint indexes with emoji before the emote
const p2 = L.messageParts('😀 Kappa', '25:2-6', null); ok(p2.length === 2 && p2[0].v === '😀 ' && p2[1].t === 'emote', 'codepoint-aware emote positions');
const ext = new Map([['OMEGALUL', 'https://cdn.7tv.app/x.webp']]);
const p3 = L.messageParts('hello OMEGALUL world', '', ext); ok(p3.length === 3 && p3[1].t === 'emote' && p3[0].v === 'hello ' && p3[2].v === ' world', 'third-party emotes');
ok(L.messageParts('plain', '', null).length === 1, 'plain text');
ok(L.messageParts('x', '25:5-9', null).length === 1, 'out-of-range emote range ignored');
const act = L.twitchMessage(L.parseIrc(':a!a@a.tmi.twitch.tv PRIVMSG #c :\u0001ACTION waves\u0001')); ok(act.action && act.text === 'waves', 'ACTION messages');
ok(L.parseIrc('PING :tmi.twitch.tv').cmd === 'PING', 'ping');
ok(L.twitchMessage(L.parseIrc(':tmi.twitch.tv 001 justinfan1 :Welcome')) === null, 'non-chat ignored');
const h = L.hideSet('Nightbot, StreamElements,,'); ok(h.has('nightbot') && h.has('streamelements') && h.size === 2, 'hide list');
console.log(`chat-lib: ${n} assertions passed`);
