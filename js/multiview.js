/* Multiview: Twitch + YouTube (+ Kick) with auto-detection */
add('multiview','util','▦','Multiview','Watch multiple Twitch & YouTube streams side by side, with chat.',el=>{
 const isFile=location.protocol==='file:',par=location.hostname||'localhost',MAX=9;
 const KIND={twitch:'Twitch live',tvod:'Twitch VOD',tclip:'Twitch clip',yt:'YouTube video / live',ytlive:'YouTube channel live',ytuser:'YouTube uploads',ytlist:'YouTube playlist',kick:'Kick'};
 const grp=p=>p==='twitch'||p==='tvod'||p==='tclip'?'twitch':p==='kick'?'kick':'yt';
 const RES=/^(directory|videos|p|downloads|settings|subscriptions|turbo|jobs|store|friends|wallet|inventory|drops|prime|search|login|signup|u|popout|embed|moderator|team)$/i;
 const HANDLE='YouTube @handles can’t be embedded directly. Paste a video/live link, or a channel link of the form youtube.com/channel/UC… (find it in the channel’s About → Share → Copy channel ID).';
 /* ---- parsing ---- */
 const parse=(raw,force='')=>{let s=raw.trim();if(!s)return{err:'Empty'};
  const m0=s.match(/^(twitch|yt|youtube|kick):(.+)$/i);if(m0){force=m0[1].toLowerCase().replace('youtube','yt');s=m0[2].trim()}
  const tw=n=>/^\w{1,25}$/.test(n)&&!RES.test(n)?{p:'twitch',id:n.toLowerCase()}:{err:'Not a valid Twitch channel name'};
  let m;const url=/(twitch\.tv|youtube\.com|youtu\.be|youtube-nocookie\.com|kick\.com)/i.test(s)||/^https?:\/\//i.test(s)||/\w\.\w{2,}\//.test(s);
  if(url){
   if(m=s.match(/twitch\.tv\/videos\/(\d+)/i))return{p:'tvod',id:m[1]};
   if(m=s.match(/clips\.twitch\.tv\/(?:embed\?clip=)?([\w-]+)/i)||s.match(/twitch\.tv\/\w+\/clip\/([\w-]+)/i))return{p:'tclip',id:m[1]};
   if(m=s.match(/twitch\.tv\/(?:popout\/)?([\w]+)/i))return tw(m[1]);
   if(m=s.match(/kick\.com\/([\w-]+)/i))return/^[\w-]{1,25}$/.test(m[1])?{p:'kick',id:m[1].toLowerCase()}:{err:'Not a valid Kick channel'};
   if(/youtu\.?be/i.test(s)){
    if(m=s.match(/youtu\.be\/([\w-]{11})/i)||s.match(/[?&]v=([\w-]{11})/)||s.match(/youtube(?:-nocookie)?\.com\/(?:live|shorts|embed|v)\/([\w-]{11})/i))return{p:'yt',id:m[1]};
    if(/playlist/.test(s)&&(m=s.match(/[?&]list=([\w-]{10,})/)))return{p:'ytlist',id:m[1]};
    if(m=s.match(/\/channel\/(UC[\w-]{22})/))return{p:'ytlive',id:m[1]};
    if(m=s.match(/\/user\/([\w.-]+)/i))return{p:'ytuser',id:m[1]};
    if(/\/(@|c\/)/i.test(s))return{err:HANDLE};
    return{err:'Could not find a video or channel in that YouTube link'}}
   return{err:'Only Twitch, YouTube and Kick links are supported'}}
  if(force==='yt'||(!force&&(/^UC[\w-]{22}$/.test(s)||(/^[\w-]{11}$/.test(s)&&s.includes('-')))||/^@/.test(s))){
   if(/^UC[\w-]{22}$/.test(s))return{p:'ytlive',id:s};if(/^[\w-]{11}$/.test(s))return{p:'yt',id:s};
   if(/^@/.test(s)||force==='yt')return{err:/^[\w.@-]+$/.test(s)?HANDLE:'Paste a YouTube link or 11-character video ID'}}
  if(force==='kick')return/^[\w-]{1,25}$/.test(s)?{p:'kick',id:s.toLowerCase()}:{err:'Not a valid Kick channel'};
  return tw(s)};
 const src=s=>{const m=s.m!==false,t=m?'true':'false';switch(s.p){
  case'twitch':return`https://player.twitch.tv/?channel=${s.id}&parent=${par}&muted=${t}&autoplay=true`;
  case'tvod':return`https://player.twitch.tv/?video=v${s.id}&parent=${par}&muted=${t}&autoplay=true`;
  case'tclip':return`https://clips.twitch.tv/embed?clip=${s.id}&parent=${par}&muted=${t}&autoplay=true`;
  case'yt':return`https://www.youtube.com/embed/${s.id}?autoplay=1&mute=${m?1:0}&playsinline=1&rel=0`;
  case'ytlive':return`https://www.youtube.com/embed/live_stream?channel=${s.id}&autoplay=1&mute=${m?1:0}&playsinline=1`;
  case'ytuser':return`https://www.youtube.com/embed?listType=user_uploads&list=${encodeURIComponent(s.id)}&autoplay=1&mute=${m?1:0}&playsinline=1`;
  case'ytlist':return`https://www.youtube.com/embed/videoseries?list=${s.id}&autoplay=1&mute=${m?1:0}&playsinline=1`;
  default:return`https://player.kick.com/${s.id}?muted=${t}&autoplay=true`}};
 const chatSrc=s=>s.p==='twitch'?`https://www.twitch.tv/embed/${s.id}/chat?parent=${par}&darkpopout`:s.p==='yt'?`https://www.youtube.com/live_chat?v=${s.id}&embed_domain=${par}`:s.p==='kick'?`https://kick.com/popout/${s.id}/chat`:'';
 const ext=s=>({twitch:`https://www.twitch.tv/${s.id}`,tvod:`https://www.twitch.tv/videos/${s.id}`,tclip:`https://clips.twitch.tv/${s.id}`,yt:`https://www.youtube.com/watch?v=${s.id}`,ytlive:`https://www.youtube.com/channel/${s.id}/live`,ytuser:`https://www.youtube.com/user/${s.id}`,ytlist:`https://www.youtube.com/playlist?list=${s.id}`,kick:`https://kick.com/${s.id}`})[s.p];
 /* ---- state ---- */
 let uid=0,cols=0,flt='all',solo=true,chatUid=null,drag=null;
 let S=LS.g('mv.cur',[]).filter(x=>x&&KIND[x.p]&&x.id).map(x=>({uid:++uid,p:x.p,id:x.id,m:true,u:x.u||x.id}));
 let lay=LS.g('mv.lay',{});Object.keys(lay).forEach(k=>{if(Array.isArray(lay[k]))lay[k]={s:lay[k],cols:0}});
 el.innerHTML=page('Multiview','Add Twitch or YouTube streams by name or link. The platform is detected automatically.',`
 <div class="panel"><div class="row" style="margin:0"><input id="u" aria-label="Stream name or link" placeholder="Twitch name, or a Twitch / YouTube link (add several with spaces or commas)" style="flex:1;min-width:220px" autocomplete="off" spellcheck="false"><select id="pl" aria-label="Platform" style="width:auto"><option value="">Auto-detect</option><option value="twitch">Twitch</option><option value="yt">YouTube</option><option value="kick">Kick</option></select><button class="pri" id="add">Add stream</button></div>
 <div id="det" style="color:var(--mu);font-size:13px;margin-top:6px;min-height:20px"></div>
 <div class="row"><select id="cols" aria-label="Layout" style="width:auto"><option value="0">Auto layout</option><option value="1">1 column</option><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option><option value="f">Focus (first is large)</option></select>
 <div class="row" id="flt" style="margin:0;gap:6px"><span class="chip on" data-f="all">All</span><span class="chip" data-f="twitch">Twitch</span><span class="chip" data-f="yt">YouTube</span><span class="chip" data-f="kick">Kick</span></div>
 <label style="margin:0;display:flex;gap:6px;align-items:center;color:var(--tx)"><input type="checkbox" id="solo" checked style="width:auto"> Solo audio</label><button id="ra">Refresh all</button><button id="ma">Mute all</button><button id="clr">Clear all</button></div>
 <div class="row"><input id="ln" placeholder="Layout name" style="width:160px" aria-label="Layout name"><button id="sv">Save layout</button><select id="ld" aria-label="Load layout" style="width:auto"></select><button id="dlt">Delete layout</button></div>
 <div id="msg" role="status" style="margin-top:8px;min-height:20px"></div></div>
 <div id="empty" class="panel" style="text-align:center;color:var(--mu);padding:50px;margin-top:12px">No streams yet — add one above.</div>
 <div class="mvw"><div class="mv" id="g"></div><div class="chat" id="ch" hidden><div class="row" style="margin:0;padding:6px 10px;border-bottom:1px solid var(--line)"><b id="ct" style="margin-right:auto;font-size:13px"></b><button id="cx" aria-label="Close chat">✕</button></div><iframe id="cf" title="Chat"></iframe></div></div>
 <div class="note" id="nt">Mute, refresh and fullscreen are per tile. Drag a tile’s ⠿ label, or use ◀ ▶, to rearrange. Twitch embeds need this site on http(s) (not opened as a file). If a player stays blank the stream is probably offline.</div>`);
 const g=$('#g'),msg=(t,bad)=>{$('#msg').innerHTML=t?`<span class="${bad?'err':'ok'}">${esc(t)}</span>`:''},save=()=>LS.s('mv.cur',S.map(({p,id,u})=>({p,id,u})));
 const tileOf=id=>g.querySelector(`.tile[data-id="${id}"]`),byUid=id=>S.find(s=>s.uid===+id);
 /* ---- tiles ---- */
 const fill=(t,s,why)=>{t.querySelectorAll('iframe,.fb').forEach(n=>n.remove());
  why=why||(isFile&&grp(s.p)==='twitch'?'Twitch can’t embed from a local file. Serve the site over http(s) — see the README.':s.blocked?'This page’s host blocks embedded players.':'');
  if(why){t.insertAdjacentHTML('beforeend',`<div class="fb"><div><b>${esc(KIND[s.p])} · ${esc(s.id)}</b></div><div>${esc(why)}</div><a class="btn" href="${esc(ext(s))}" target="_blank" rel="noopener">Open on ${grp(s.p)==='yt'?'YouTube':grp(s.p)==='kick'?'Kick':'Twitch'} ↗</a></div>`);return}
  const f=document.createElement('iframe');f.title=`${KIND[s.p]} ${s.id}`;f.allowFullscreen=true;f.setAttribute('allow','autoplay; fullscreen; picture-in-picture; encrypted-media');f.referrerPolicy='strict-origin-when-cross-origin';f.src=src(s);t.append(f)};
 const mk=s=>{const t=document.createElement('div');t.className='tile';t.dataset.id=s.uid;
  t.innerHTML=`<div class="tb"><span class="lbl" draggable="true" title="Drag to rearrange">⠿ ${esc(grp(s.p)==='yt'?'YouTube':grp(s.p)==='kick'?'Kick':'Twitch')} · ${esc(s.id.length>16?s.id.slice(0,14)+'…':s.id)}</span><button data-a="l" title="Move earlier" aria-label="Move earlier">◀</button><button data-a="r" title="Move later" aria-label="Move later">▶</button><button data-a="s" title="Make main" aria-label="Make main">★</button><button data-a="rf" title="Refresh" aria-label="Refresh stream">⟳</button><button data-a="m" title="Mute / unmute" aria-label="Mute or unmute"></button><button data-a="c" title="Chat" aria-label="Toggle chat">💬</button><button data-a="o" title="Open on site" aria-label="Open on platform">↗</button><button data-a="f" title="Fullscreen" aria-label="Fullscreen">⛶</button><button data-a="x" title="Remove" aria-label="Remove stream">✕</button></div>`;
  g.append(t);fill(t,s);return t};
 const vis=()=>S.filter(s=>flt==='all'||grp(s.p)===flt);
 const layout=()=>{const v=vis(),n=v.length,w=innerWidth>=700;g.style.gridTemplateColumns=!n||!w?'1fr':cols==='f'?'repeat(3,1fr)':`repeat(${cols||(n<=2?n:n<=4?2:3)},1fr)`;
  S.forEach((s,i)=>{const t=tileOf(s.uid);if(!t)return;t.style.order=i;t.hidden=!v.includes(s);t.style.gridColumn=cols==='f'&&w&&v[0]===s?'span 3':'';const b=t.querySelector('[data-a=m]');b.textContent=s.m?'🔇':'🔊';b.setAttribute('aria-pressed',String(!s.m))});
  $('#empty').hidden=!!S.length;$('#empty').textContent=S.length&&!n?'No streams on this platform yet.':'No streams yet — add one above.';$('#empty').hidden=!!n;
  $$('#flt .chip').forEach(c=>c.classList.toggle('on',c.dataset.f===flt))};
 const sync=()=>{const keep=new Set(S.map(s=>String(s.uid)));$$('.tile',g).forEach(t=>{if(!keep.has(t.dataset.id))t.remove()});S.forEach(s=>{if(!tileOf(s.uid))mk(s)});if(chatUid&&!byUid(chatUid))closeChat();layout();save()};
 const showChat=s=>{const u=chatSrc(s);if(!u){msg(`Chat isn’t available for ${KIND[s.p]}${s.p==='ytlive'?' — add the live video link to get its chat':''}.`,true);return}
  if(isFile&&grp(s.p)==='twitch'){msg('Twitch chat needs http(s) — serve the site (see README).',true);return}
  chatUid=s.uid;$('#ct').textContent='Chat · '+s.id;$('#cf').src=u;$('#ch').hidden=false;msg('')};
 const closeChat=()=>{chatUid=null;$('#cf').removeAttribute('src');$('#ch').hidden=true};
 const reload=s=>{const t=tileOf(s.uid);if(t)fill(t,s)};
 const mute=(s,m)=>{if(s.m===m)return;s.m=m;reload(s)};
 /* ---- add ---- */
 const addRaw=()=>{const parts=$('#u').value.split(/[\s,]+/).filter(Boolean);if(!parts.length){msg('Enter a channel name or link first.',true);return}
  let added=0;const errs=[];for(const p of parts){const r=parse(p,$('#pl').value);
   if(r.err)errs.push(`“${p.length>40?p.slice(0,38)+'…':p}”: ${r.err}`);else if(S.some(s=>s.p===r.p&&s.id===r.id))errs.push(`“${p}” is already added`);else if(S.length>=MAX)errs.push(`Maximum ${MAX} streams`);else{S.push({uid:++uid,u:p,m:true,...r});added++}}
  if(added)$('#u').value=errs.length?parts.filter(p=>errs.some(e=>e.startsWith(`“${p}`))).join(' '):'';
  sync();msg((added?`Added ${added} stream${added>1?'s':''}. `:'')+errs.join(' · '),!!errs.length&&!added);if(added&&!errs.length)$('#det').textContent='';$('#u').focus()};
 const det=()=>{const parts=$('#u').value.split(/[\s,]+/).filter(Boolean),d=$('#det');if(!parts.length){d.textContent='';return}
  if(parts.length>1){d.textContent=`${parts.length} streams will be added`;return}const r=parse(parts[0],$('#pl').value);d.innerHTML=r.err?`<span class="err">${esc(r.err)}</span>`:`Detected: <b style="color:#fff">${KIND[r.p]}</b> · ${esc(r.id)}`};
 $('#add').onclick=addRaw;$('#u').addEventListener('keydown',e=>{if(e.key==='Enter')addRaw()});$('#u').addEventListener('input',det);$('#pl').onchange=det;
 /* ---- tile actions ---- */
 g.onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=b.closest('.tile'),s=byUid(t.dataset.id),a=b.dataset.a;if(!s)return;const v=vis(),i=v.indexOf(s);
  if(a==='x'){S=S.filter(x=>x!==s);sync();msg('');return}
  if(a==='rf'){reload(s);return}
  if(a==='m'){if(s.m&&solo)S.forEach(x=>{if(x!==s)mute(x,true)});mute(s,!s.m);layout();return}
  if(a==='l'||a==='r'){const n=v[i+(a==='l'?-1:1)];if(n){const x=S.indexOf(s),y=S.indexOf(n);[S[x],S[y]]=[S[y],S[x]];layout();save()}return}
  if(a==='s'){S=[s,...S.filter(x=>x!==s)];layout();save();return}
  if(a==='c'){chatUid===s.uid?closeChat():showChat(s);return}
  if(a==='o'){window.open(ext(s),'_blank','noopener');return}
  if(a==='f'){try{const r=(t.requestFullscreen||t.webkitRequestFullscreen).call(t);if(r&&r.catch)r.catch(()=>msg('Fullscreen was blocked by the browser.',true))}catch(x){msg('Fullscreen isn’t supported here.',true)}}};
 g.addEventListener('dragstart',e=>{const l=e.target.closest&&e.target.closest('.lbl');if(!l)return;drag=l.closest('.tile').dataset.id;e.dataTransfer.setData('text/plain',drag);e.dataTransfer.effectAllowed='move';g.classList.add('dnd')});
 g.addEventListener('dragover',e=>{if(drag)e.preventDefault()});
 g.addEventListener('drop',e=>{const t=e.target.closest('.tile');if(!drag||!t||t.dataset.id===drag)return;e.preventDefault();const a=S.findIndex(s=>String(s.uid)===drag),b=S.findIndex(s=>String(s.uid)===t.dataset.id),[x]=S.splice(a,1);S.splice(b,0,x);layout();save()});
 g.addEventListener('dragend',()=>{drag=null;g.classList.remove('dnd')});
 on(document,'securitypolicyviolation',e=>{const f=$$('iframe',g).find(x=>e.blockedURI&&(x.src===e.blockedURI||x.src.startsWith(e.blockedURI)||e.blockedURI.startsWith(x.src.slice(0,50))));if(!f)return;const t=f.closest('.tile'),s=byUid(t.dataset.id);if(s){s.blocked=true;fill(t,s)}$('#nt').innerHTML='<b>Embedded players are blocked by this page’s host.</b> Use the tile’s “Open” button, or run the downloaded VOQCL-TOOLS site from your own server or localhost where embedding is allowed.'});
 /* ---- toolbar ---- */
 $('#cols').onchange=e=>{cols=e.target.value==='f'?'f':+e.target.value;layout()};
 $('#flt').onclick=e=>{const c=e.target.closest('.chip');if(c){flt=c.dataset.f;layout()}};
 $('#solo').onchange=e=>solo=e.target.checked;$('#ra').onclick=()=>{S.forEach(reload);msg(S.length?'Refreshed all streams.':'')};$('#ma').onclick=()=>{S.forEach(s=>mute(s,true));layout()};
 $('#clr').onclick=()=>{S=[];sync();msg('')};$('#cx').onclick=closeChat;
 const lds=(sel='')=>{$('#ld').innerHTML='<option value="">Load layout…</option>'+Object.keys(lay).map(k=>`<option ${k===sel?'selected':''}>${esc(k)}</option>`).join('')};
 $('#sv').onclick=()=>{const n=$('#ln').value.trim();if(!n){msg('Enter a layout name first.',true);return}if(!S.length){msg('Add at least one stream before saving a layout.',true);return}lay[n]={s:S.map(({p,id,u})=>({p,id,u})),cols};LS.s('mv.lay',lay);lds(n);msg(`Saved layout “${n}”.`)};
 $('#ld').onchange=e=>{const l=lay[e.target.value];if(!l)return;S=l.s.filter(x=>KIND[x.p]).map(x=>({uid:++uid,p:x.p,id:x.id,m:true,u:x.u||x.id}));cols=l.cols||0;$('#cols').value=cols;closeChat();sync();msg(`Loaded “${e.target.value}”.`)};
 $('#dlt').onclick=()=>{const k=$('#ld').value;if(!k){msg('Pick a layout to delete.',true);return}delete lay[k];LS.s('mv.lay',lay);lds();msg(`Deleted “${k}”.`)};
 on(window,'resize',()=>{if($('#g'))layout()});
 lds();sync()});
