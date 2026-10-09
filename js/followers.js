/* Retained: follower tracker (live view) */
const DEC='https://decapi.me/twitch/';
const decTxt=async p=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);try{const r=await fetch(DEC+p,{signal:c.signal});if(!r.ok)throw new Error('Service returned '+r.status);return(await r.text()).trim()}finally{clearTimeout(t)}};
function liveView(box,ch,overlay,platform='twitch',opt={}){
 const yt=platform==='youtube',key='live.'+platform+'.'+ch;let hist=LS.g(key,[]).filter(p=>Date.now()-p[0]<16*36e5),av='',cur=null,err='';
 box.innerHTML=`<div class="lv"><div class="avw"><img class="av" alt="" hidden><div class="av ph">${esc(ch[0].toUpperCase())}</div></div><div class="nm">${esc(ch)}</div><div class="cnt">…</div><div class="lb">${yt?'Subscribers':'Followers'}</div><div class="err lerr"></div><div class="chart" ${overlay?'hidden':''}></div></div>`;
 if(opt.size&&opt.size!==100)box.firstChild.style.zoom=opt.size/100;if(opt.avatar===false)$('.avw',box).hidden=true;
 const q=s=>$(s,box),img=q('img.av');img.onerror=()=>{img.hidden=true;q('.ph').hidden=false};img.onload=()=>{img.hidden=false;q('.ph').hidden=true};
 const chart=()=>{if(hist.length<2){return`<div style="color:var(--mu);text-align:center;font-size:12px">Collecting history… (updates every 15s)</div>`}
  const W=700,H=150,v=hist.map(p=>p[1]),mn=Math.min(...v),mx=Math.max(...v),lo=mn===mx?mn-1:mn,hi=mn===mx?mx+1:mx,t0=hist[0][0],t1=hist[hist.length-1][0],xs=t=>(t-t0)/Math.max(1,t1-t0)*W,ys=n=>H-(n-lo)/(hi-lo)*(H-12)-6;
  const pts=hist.map(p=>xs(p[0]).toFixed(1)+','+ys(p[1]).toFixed(1)).join(' '),gain=v[v.length-1]-v[0],hrs=Math.max(0,(t1-t0)/36e5),span=hrs<1?Math.max(1,Math.round(hrs*60))+'m':hrs.toFixed(1)+'h',f=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return`<div class="row" style="justify-content:space-between;margin:0 0 6px;font-size:12px;color:var(--mu)"><span><b style="color:#fff">${gain>0?'+':gain<0?'−':'±'}${Math.abs(gain)}</b> followers gained</span><span>last ${span}</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:150px;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${pts} ${W},${H}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="row" style="justify-content:space-between;margin:4px 0 0;font-size:11px;color:var(--mu)"><span>${f(t0)}</span><span>${f(t1)}</span></div>`};
 const paint=()=>{if(!box.isConnected||!q('.cnt'))return;q('.cnt').textContent=cur==null?(err?'—':'…'):cur.toLocaleString();q('.lerr').textContent=err?err+' · retrying…':'';if(!overlay)q('.chart').innerHTML=chart()};
 const poll=async()=>{try{
  if(yt){const r=await ytApi('channel',{q:ch});if(r.avatar&&!av){av=r.avatar;img.src=av}if(r.title)q('.nm').textContent=r.title;if(r.subscribers==null)throw new Error('This channel hides its subscriber count');cur=r.subscribers}
  else{if(!av){try{const a=await decTxt('avatar/'+ch);if(/^https?:\/\//.test(a)){av=a;img.src=a}}catch(e){}}
  const t=await decTxt('followcount/'+ch);if(!/^\d+$/.test(t))throw new Error(/not found|no user|invalid/i.test(t)?'Channel not found':(t.slice(0,60)||'Unexpected response'));cur=+t}
  err='';hist.push([Date.now(),cur]);hist=hist.slice(-1500);LS.s(key,hist)}catch(e){err=e.name==='AbortError'?'Request timed out':e.message==='Failed to fetch'?'Could not reach the data service':e.message}paint()};
 paint();poll();tm(poll,yt?60000:15000)}

add('followlive','obs','♥','Follower tracker','Live follower / subscriber count with a history chart and an OBS overlay URL.',el=>{
 el.innerHTML=page('Follower tracker','Track any Twitch channel\'s followers or a YouTube channel\'s subscribers live, with a history chart.',`<div class="panel"><div class="row" style="margin:0"><select id="pf" style="width:150px"><option value="twitch">Twitch</option><option value="youtube">YouTube</option></select><input id="c" placeholder="Twitch channel, e.g. voqcl" style="flex:1;min-width:200px" autocomplete="off" spellcheck="false"><button class="pri" id="go">Track</button></div><div id="e" class="err" style="margin-top:6px"></div></div>
 <div class="panel" id="lv" style="margin-top:10px;background:#000;display:none"></div>
 <div class="panel" id="ob" style="margin-top:10px;display:none"></div>`);
 let upd=null;
 const go=()=>{const pf=$('#pf').value,c=pf==='twitch'?$('#c').value.trim().replace(/^@/,''):$('#c').value.trim();
  if(pf==='twitch'&&!/^\w{3,25}$/.test(c)){$('#e').textContent='Enter a valid Twitch channel name (3–25 letters, numbers or underscores).';return}
  if(pf==='youtube'&&!c){$('#e').textContent='Enter a YouTube @handle or channel ID (UC…).';return}
  $('#e').textContent='';LS.s('live.last',{pf,c});runClean();$('#lv').style.display='block';
  liveView($('#lv'),pf==='twitch'?c.toLowerCase():c,false,pf);
  $('#ob').style.display='block';const vals=()=>({platform:$('#pf').value,user:$('#c').value.trim().replace(/^@(?=[\w])/,pf==='youtube'?'@':'')||c,chart:false});
  upd=ovUrlPanel($('#ob'),'followtracker',()=>({platform:pf,user:pf==='youtube'?c:c.toLowerCase()}))};
 $('#pf').onchange=()=>{$('#c').placeholder=$('#pf').value==='twitch'?'Twitch channel, e.g. voqcl':'YouTube @handle or channel ID'};
 $('#go').onclick=go;$('#c').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
 const last=LS.g('live.last',null);if(last&&last.c){$('#pf').value=last.pf;$('#pf').onchange();$('#c').value=last.c;go()}});
