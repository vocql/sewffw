/* Retained tools: emote, mask, bgr (unchanged from original) */
const add=(id,cat,ic,name,desc,fn,tag)=>T.push({id,cat,ic,name,desc,fn,tag});
add('emote','obs','☺','Emote Overlay','Floating emote bursts for your stream. Preview, then export for OBS.',el=>{
 el.innerHTML=page('Emote Overlay','Choose emotes or upload your own image. Bursts rise from the bottom of the screen.',`<div class="two"><div class="panel">
 <label>Emotes (separate with spaces)</label><input id="a" value="🔥 💜 😂 🎉 ⭐"><label>Or upload an emote image</label><input id="f" type="file" accept="image/*">
 <label>Burst size</label><input id="n" type="range" min="1" max="20" value="6"><label>Auto-burst every (seconds, export)</label><input id="s" type="number" min="1" value="8">
 <div class="row"><button class="pri" id="b">Burst!</button><button id="rs">Reset</button></div></div>
 <div><div class="panel checker" id="st" style="position:relative;height:300px;overflow:hidden"></div><div class="row"><button class="pri" id="ex">Download OBS overlay</button><button id="cp">Copy overlay HTML</button></div>
 <div class="note">Overlays are static files: they fire on a timer instead of reacting to live chat. Live chat triggers need a server, which this site doesn't have.</div>${OBSNOTE}</div></div>`);
 let img=null;const items=()=>img?[`<img src="${img}" style="height:48px">`]:$('#a').value.split(/\s+/).filter(Boolean).map(esc);
 const burst=()=>{const L=items();if(!L.length)return;for(let i=0;i<+$('#n').value;i++){const s=document.createElement('span');s.className='em';s.style.left=Math.random()*90+'%';s.style.animationDelay=Math.random()*.6+'s';s.innerHTML=L[i%L.length];$('#st').append(s);setTimeout(()=>s.remove(),3200)}};
 $('#b').onclick=burst;$('#rs').onclick=()=>{img=null;rerun(el)};
 $('#f').onchange=e=>{const r=new FileReader();const f=e.target.files[0];if(!f)return;r.onload=()=>img=r.result;r.readAsDataURL(f)};
 const doc=()=>overlayDoc('<div id="s"></div>',`const L=${JSON.stringify(items())},n=${+$('#n').value};function b(){for(let i=0;i<n;i++){const s=document.createElement('span');s.className='em';s.style.left=Math.random()*90+'%';s.style.animationDelay=Math.random()*.6+'s';s.innerHTML=L[i%L.length];document.body.append(s);setTimeout(()=>s.remove(),3200)}}b();setInterval(b,${Math.max(1,+$('#s').value||8)*1000});`);
 $('#ex').onclick=()=>dl('voqcl-emote-overlay.html',doc(),'text/html');$('#cp').onclick=e=>copy(doc(),e.target)});

add('mask','util','◐','Mask / Webcam Shape','Make a transparent webcam frame mask in any shape. Download as PNG.',el=>{
 el.innerHTML=page('Mask / Webcam Shape Generator','Creates a frame PNG with a transparent shape cut-out. Layer it over your webcam, or use it as an Image Mask in OBS.',`<div class="two"><div class="panel">
 <label>Shape</label><select id="sh"><option>circle</option><option>rounded</option><option>hexagon</option><option>diamond</option><option>star</option><option>heart</option><option>triangle</option></select>
 <label>Width</label><input id="w" type="number" value="640"><label>Height</label><input id="h" type="number" value="640"><label>Corner radius (rounded)</label><input id="r" type="range" min="0" max="50" value="20">
 <label>Padding (%)</label><input id="p" type="range" min="0" max="30" value="4"><label>Frame colour</label><input id="c" type="color" value="#000000"><label><input type="checkbox" id="i" style="width:auto"> Invert (shape filled, outside transparent)</label>
 <div class="row"><button class="pri" id="d">Download PNG</button><button id="rs">Reset</button></div></div><div class="panel checker"><canvas id="cv"></canvas></div></div>`);
 const path=(x,t,w,h,p,r)=>{const cx=w/2,cy=h/2,rx=cx-w*p/100,ry=cy-h*p/100;x.beginPath();
  if(t==='circle')x.ellipse(cx,cy,rx,ry,0,0,7);
  else if(t==='rounded'){const k=Math.min(rx,ry)*r/50;x.roundRect(cx-rx,cy-ry,rx*2,ry*2,k)}
  else if(t==='triangle'){x.moveTo(cx,cy-ry);x.lineTo(cx+rx,cy+ry);x.lineTo(cx-rx,cy+ry);x.closePath()}
  else if(t==='heart'){x.moveTo(cx,cy+ry);x.bezierCurveTo(cx-rx*1.6,cy-ry*.1,cx-rx*.7,cy-ry*1.2,cx,cy-ry*.35);x.bezierCurveTo(cx+rx*.7,cy-ry*1.2,cx+rx*1.6,cy-ry*.1,cx,cy+ry);x.closePath()}
  else{const n=t==='hexagon'?6:t==='diamond'?4:10;for(let i=0;i<n;i++){const a=Math.PI*2*i/n-Math.PI/2+(t==='hexagon'?Math.PI/6:0),k=t==='star'&&i%2?.45:1;x[i?'lineTo':'moveTo'](cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k)}x.closePath()}};
 const draw=()=>{const cv=$('#cv'),w=Math.min(2000,Math.max(32,+$('#w').value||640)),h=Math.min(2000,Math.max(32,+$('#h').value||640));cv.width=w;cv.height=h;const x=cv.getContext('2d'),inv=$('#i').checked;
  x.fillStyle=$('#c').value;if(!inv)x.fillRect(0,0,w,h);path(x,$('#sh').value,w,h,+$('#p').value,+$('#r').value);if(inv)x.fill();else{x.globalCompositeOperation='destination-out';x.fill()}};
 $$('input,select',el).forEach(i=>i.oninput=draw);$('#d').onclick=()=>$('#cv').toBlob(b=>dl('voqcl-mask.png',b));$('#rs').onclick=()=>{rerun(el)};draw()});

add('bgr','util','✂','Background Remover','Remove solid or green-screen backgrounds in your browser. Nothing is uploaded.',el=>{
 el.innerHTML=page('Background Remover','Colour-based removal: click the background to pick it, then tune tolerance. Best for solid, green or clean backgrounds.',`<div class="two"><div class="panel">
 <label>Image</label><input id="f" type="file" accept="image/*"><label>Tolerance</label><input id="t" type="range" min="1" max="200" value="60"><label>Edge softness</label><input id="s" type="range" min="0" max="80" value="20">
 <div id="m" class="note">Upload an image, then click the background to pick its colour.</div><div class="row"><button class="pri" id="d">Download PNG</button><button id="rs">Reset</button></div></div><div class="panel checker"><canvas id="cv" width="400" height="240"></canvas></div></div>`);
 let O=null,k=null,W,H;const cv=$('#cv'),x=cv.getContext('2d',{willReadFrequently:true});
 const run=()=>{if(!O||!k)return;const t=+$('#t').value,s=+$('#s').value,d=new ImageData(new Uint8ClampedArray(O.data),W,H),p=d.data;
  for(let i=0;i<p.length;i+=4){const q=Math.hypot(p[i]-k[0],p[i+1]-k[1],p[i+2]-k[2]);if(q<t)p[i+3]=0;else if(q<t+s)p[i+3]=p[i+3]*(q-t)/s}x.putImageData(d,0,0)};
 $('#f').onchange=e=>{const f=e.target.files[0];if(!f)return;loadImg(f,i=>{const r=Math.min(1,900/Math.max(i.width,i.height));W=cv.width=Math.round(i.width*r);H=cv.height=Math.round(i.height*r);x.drawImage(i,0,0,W,H);O=x.getImageData(0,0,W,H);k=[...O.data.slice(0,3)];$('#m').textContent='Using top-left pixel as background. Click the image to pick another colour.';run()},m=>$('#m').innerHTML=`<span class="err">${m}</span>`)};
 cv.onclick=e=>{if(!O)return;const r=cv.getBoundingClientRect(),px=Math.floor((e.clientX-r.left)*W/r.width),py=Math.floor((e.clientY-r.top)*H/r.height),i=(py*W+px)*4;k=[O.data[i],O.data[i+1],O.data[i+2]];run()};
 $$('input[type=range]',el).forEach(i=>i.oninput=run);
 $('#d').onclick=()=>O?cv.toBlob(b=>dl('voqcl-cutout.png',b)):$('#m').innerHTML='<span class="err">Upload an image first.</span>';$('#rs').onclick=()=>{rerun(el)}});

