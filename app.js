const DEFAULT_CHARS=[...'abcdefghijklmnopqrstuvwxyz','0','1','2','3','4','5','6','7','8','9'];
const DEFAULT_SETTINGS={randomImage:true,randomSize:true,autoCap:true,normalize:true,normW:256,normH:256,normMode:'contain',sizeMin:90,sizeMax:110,spacing:-12};
const DB='image-text-tool-v3',STORE='project';
let state=window.__BUNDLED_PROJECT__||{chars:[...DEFAULT_CHARS],images:Object.fromEntries(DEFAULT_CHARS.map(c=>[c,[]])),settings:{...DEFAULT_SETTINGS},text:''};
let crop={char:null,index:null,img:null,sel:null,drag:false,sx:0,sy:0,pad:0,angle:0,scale:1};

const $=id=>document.getElementById(id);
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function save(){const db=await openDB();return new Promise((ok,no)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(state,'state');tx.oncomplete=ok;tx.onerror=()=>no(tx.error)})}
async function load(){const db=await openDB();return new Promise((ok,no)=>{const q=db.transaction(STORE).objectStore(STORE).get('state');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
async function clearDB(){const db=await openDB();return new Promise((ok,no)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=ok;tx.onerror=()=>no(tx.error)})}
const waitSave=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>save().catch(console.error),400)}})();
const clamp=(v,a,b,d)=>Number.isFinite(+v)?Math.min(b,Math.max(a,+v)):d;
function normalizeState(x){return{chars:Array.isArray(x?.chars)?[...new Set(x.chars.map(String))]:[...DEFAULT_CHARS],images:Object.fromEntries((x?.chars||DEFAULT_CHARS).map(c=>[c,Array.isArray(x?.images?.[c])?[...x.images[c]]:[]])),settings:{...DEFAULT_SETTINGS,...(x?.settings||{})},text:String(x?.text||'')}}

function syncUI(){const s=state.settings;['randomImage','randomSize','autoCap','normalize'].forEach(id=>$(id).checked=!!s[id]);['normW','normH','sizeMin','sizeMax'].forEach(id=>$(id).value=s[id]);$('normMode').value=s.normMode;$('spacing').value=s.spacing;$('spacingValue').value=s.spacing+' px'}
function readUI(){state.settings.randomImage=$('randomImage').checked;state.settings.randomSize=$('randomSize').checked;state.settings.autoCap=$('autoCap').checked;state.settings.normalize=$('normalize').checked;state.settings.normW=clamp($('normW').value,16,2048,256);state.settings.normH=clamp($('normH').value,16,2048,256);state.settings.normMode=$('normMode').value;state.settings.sizeMin=clamp($('sizeMin').value,50,150,90);state.settings.sizeMax=clamp($('sizeMax').value,50,150,110);if(state.settings.sizeMin>state.settings.sizeMax)[state.settings.sizeMin,state.settings.sizeMax]=[state.settings.sizeMax,state.settings.sizeMin];state.settings.spacing=clamp($('spacing').value,-80,50,-12);syncUI();waitSave();render()}

function readDataURL(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(f)})}
function loadImage(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function normalize(src){if(!state.settings.normalize)return src;const i=await loadImage(src),w=state.settings.normW,h=state.settings.normH,c=document.createElement('canvas'),x=c.getContext('2d');c.width=w;c.height=h;x.clearRect(0,0,w,h);if(state.settings.normMode==='stretch'){x.drawImage(i,0,0,w,h)}else{const k=state.settings.normMode==='contain'?Math.min(w/i.naturalWidth,h/i.naturalHeight):Math.max(w/i.naturalWidth,h/i.naturalHeight),dw=i.naturalWidth*k,dh=i.naturalHeight*k;x.drawImage(i,(w-dw)/2,(h-dh)/2,dw,dh)}return c.toDataURL('image/png')}
async function addFiles(ch,files){for(const f of files){if(!f.type.startsWith('image/'))continue;state.images[ch].push(await normalize(await readDataURL(f)))}renderChars();render();waitSave()}

function isStart(t,i){if(i===0)return true;let j=i-1;while(j>=0&&/[ \t\r]/.test(t[j]))j--;return j<0||/[.!?。！？\n]/.test(t[j])}
function pick(ch){const a=state.images[ch]||[];return a.length?(state.settings.randomImage?a[Math.floor(Math.random()*a.length)]:a[0]):null}
function render(){const p=$('preview');p.innerHTML='';const t=state.text||'';let prev=false;for(let i=0;i<t.length;i++){const ch=t[i];if(ch==='\n'){p.appendChild(document.createElement('br'));prev=false;continue}if(ch===' '){p.appendChild(document.createTextNode(' '));prev=false;continue}const d=pick(ch),gap=prev?state.settings.spacing:0;if(!d){const s=document.createElement('span');s.textContent=ch;s.style.marginLeft=gap+'px';p.appendChild(s);prev=true;continue}const im=document.createElement('img');im.className='glyph';im.src=d;const r=state.settings.randomSize?(Math.random()*(state.settings.sizeMax-state.settings.sizeMin)+state.settings.sizeMin)/100:1;const cap=state.settings.autoCap&&/[A-Za-z]/.test(ch)&&isStart(t,i)?1.22:1;im.style.height=(38*r*cap)+'px';im.style.marginLeft=gap+'px';p.appendChild(im);prev=true}}

function renderChars(){const g=$('charGrid');g.innerHTML='';state.chars.forEach(ch=>{const card=document.createElement('div');card.className='charCard';const h=document.createElement('div');h.className='charHead';h.innerHTML='<span class="char"></span>';h.firstChild.textContent=ch;if(!DEFAULT_CHARS.includes(ch)){const b=document.createElement('button');b.textContent='削除';b.onclick=()=>{delete state.images[ch];state.chars=state.chars.filter(x=>x!==ch);renderChars();renderKeyboard();render();waitSave()};h.appendChild(b)}card.appendChild(h);const drop=document.createElement('label');drop.className='drop';drop.innerHTML='画像をドロップ<br>またはクリックして選択<small>（複数選択OK）</small>';const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.multiple=true;drop.appendChild(fi);drop.onchange=()=>addFiles(ch,fi.files);drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag')};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');addFiles(ch,e.dataTransfer.files)};card.appendChild(drop);const ts=document.createElement('div');ts.className='thumbs';(state.images[ch]||[]).forEach((src,i)=>{const t=document.createElement('div');t.className='thumb';const im=document.createElement('img');im.src=src;t.appendChild(im);const ed=document.createElement('button');ed.className='edit';ed.textContent='切';ed.onclick=()=>openCrop(ch,i);const de=document.createElement('button');de.className='del';de.textContent='×';de.onclick=()=>{state.images[ch].splice(i,1);renderChars();render();waitSave()};t.append(ed,de);ts.appendChild(t)});card.appendChild(ts);g.appendChild(card)})}
function renderKeyboard(){const k=$('keyboard');k.innerHTML='';state.chars.forEach(ch=>{const b=document.createElement('button');b.className='key';b.textContent=ch;b.onclick=()=>insert(ch);k.appendChild(b)});const e=document.createElement('button');e.className='key';e.textContent='↵';e.onclick=()=>insert('\n');k.appendChild(e)}
function insert(s){const ta=$('text'),a=ta.selectionStart,b=ta.selectionEnd;ta.value=ta.value.slice(0,a)+s+ta.value.slice(b);ta.selectionStart=ta.selectionEnd=a+s.length;state.text=ta.value;render();waitSave();ta.focus()}

function openCrop(ch,index){crop={char:ch,index,img:null,sel:null,drag:false,sx:0,sy:0,pad:0,angle:0,scale:1};$('cropModal').classList.remove('hidden');$('cropImage').src='';$('cropOverlay').width=1;$('cropOverlay').height=1;loadImage(state.images[ch][index]).then(i=>{crop.img=i;const maxW=760,maxH=560,k=Math.min(maxW/i.naturalWidth,maxH/i.naturalHeight,1);crop.scale=k;const w=Math.max(1,Math.round(i.naturalWidth*k)),h=Math.max(1,Math.round(i.naturalHeight*k));const im=$('cropImage');im.width=w;im.height=h;im.src=i.src;const c=$('cropOverlay');c.width=w;c.height=h;c.style.width=w+'px';c.style.height=h+'px';drawCrop();updateResult()}).catch(()=>{$('cropInfo').textContent='画像の読み込みに失敗しました'})}
function point(e){const c=$('cropOverlay'),r=c.getBoundingClientRect();return{x:Math.max(0,Math.min(c.width,(e.clientX-r.left)*c.width/r.width)),y:Math.max(0,Math.min(c.height,(e.clientY-r.top)*c.height/r.height))}}
function sel(){if(!crop.sel)return null;return{x:Math.min(crop.sel.x,crop.sel.x+crop.sel.w),y:Math.min(crop.sel.y,crop.sel.y+crop.sel.h),w:Math.abs(crop.sel.w),h:Math.abs(crop.sel.h)}}
function drawCrop(){const c=$('cropOverlay'),x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);const s=sel();x.setLineDash([6,4]);x.strokeStyle='#fff';x.lineWidth=2;if(s&&s.w>1&&s.h>1){x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,c.width,s.y);x.fillRect(0,s.y+s.h,c.width,c.height-s.y-s.h);x.fillRect(0,s.y,s.x,s.h);x.fillRect(s.x+s.w,s.y,c.width-s.x-s.w,s.h);x.strokeRect(s.x+.5,s.y+.5,s.w-1,s.h-1);x.setLineDash([4,5]);x.lineWidth=1.5;x.beginPath();x.moveTo(s.x+s.w/2,s.y);x.lineTo(s.x+s.w/2,s.y+s.h);x.moveTo(s.x,s.y+s.h/2);x.lineTo(s.x+s.w,s.y+s.h/2);x.stroke();}else{x.setLineDash([4,5]);x.beginPath();x.moveTo(c.width/2,0);x.lineTo(c.width/2,c.height);x.moveTo(0,c.height/2);x.lineTo(c.width,c.height/2);x.stroke()}}
function cropRect(){const s=sel();if(!s||!crop.img)return null;const sx=Math.round(s.x/crop.scale),sy=Math.round(s.y/crop.scale),sw=Math.max(1,Math.round(s.w/crop.scale)),sh=Math.max(1,Math.round(s.h/crop.scale));return{sx,sy,sw:Math.min(sw,crop.img.naturalWidth-sx),sh:Math.min(sh,crop.img.naturalHeight-sy)}}
function processed(){const r=cropRect();if(!r)return null;const p=crop.pad/100,px=Math.round(r.sw*p),py=Math.round(r.sh*p),bw=r.sw+px*2,bh=r.sh+py*2,a=crop.angle*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),ow=Math.ceil(bw*c+bh*s),oh=Math.ceil(bw*s+bh*c),o=document.createElement('canvas');o.width=ow;o.height=oh;const x=o.getContext('2d');x.translate(ow/2,oh/2);x.rotate(a);x.drawImage(crop.img,r.sx,r.sy,r.sw,r.sh,-bw/2+px,-bh/2+py,r.sw,r.sh);return o}
function updateResult(){drawCrop();const out=$('resultCanvas'),r=processed();if(!r){out.width=1;out.height=1;$('cropInfo').textContent='範囲未選択';return}out.width=r.width;out.height=r.height;out.style.width=Math.min(r.width,300)+'px';out.style.height='auto';out.getContext('2d').drawImage(r,0,0);const z=cropRect();$('cropInfo').textContent=z?z.sw+' × '+z.sh+' px → '+r.width+' × '+r.height+' px':'範囲未選択'}
function closeCrop(){$('cropModal').classList.add('hidden')}
function applyCrop(){const r=processed();if(!r){alert('切り抜き範囲を指定してね♡');return}state.images[crop.char][crop.index]=r.toDataURL('image/png');closeCrop();renderChars();render();waitSave()}

$('cropOverlay').onpointerdown=e=>{if(!crop.img)return;const p=point(e);crop.drag=true;crop.sx=p.x;crop.sy=p.y;crop.sel={x:p.x,y:p.y,w:0,h:0};$('cropOverlay').setPointerCapture(e.pointerId);drawCrop();updateResult()};
$('cropOverlay').onpointermove=e=>{if(!crop.drag)return;const p=point(e);crop.sel={x:crop.sx,y:crop.sy,w:p.x-crop.sx,h:p.y-crop.sy};drawCrop();updateResult()};
$('cropOverlay').onpointerup=e=>{crop.drag=false;try{$('cropOverlay').releasePointerCapture(e.pointerId)}catch{};updateResult()};
$('padding').oninput=e=>{crop.pad=+e.target.value;$('padOut').value=crop.pad+'%';updateResult()};
$('angle').oninput=e=>{crop.angle=+e.target.value;$('angleOut').value=crop.angle+'°';updateResult()};
$('resetCrop').onclick=()=>{crop.sel=null;crop.pad=0;crop.angle=0;$('padding').value=0;$('angle').value=0;$('padOut').value='0%';$('angleOut').value='0°';updateResult()};
$('closeCrop').onclick=closeCrop;$('applyCrop').onclick=applyCrop;

async function renorm(){for(const ch of state.chars)for(let i=0;i<(state.images[ch]||[]).length;i++)state.images[ch][i]=await normalize(state.images[ch][i]);renderChars();render();waitSave()}

function mimeOf(data){return((data.match(/^data:([^;,]+)/)||[])[1])||'image/png'}
function extOf(mime){return mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'png'}
async function exportPreviewPNG(){
  try{
    const p=$('preview');
    const items=[];
    const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(!node.textContent)continue;
      for(let i=0;i<node.textContent.length;i++){
        if(node.textContent[i]===' '||node.textContent[i]==='\n')continue;
        const range=document.createRange();
        range.setStart(node,i);
        range.setEnd(node,i+1);
        const rect=range.getBoundingClientRect();
        if(rect.width>0&&rect.height>0)items.push({kind:'text',text:node.textContent[i],node,rect});
      }
    }
    p.querySelectorAll('img.glyph').forEach(el=>{
      const rect=el.getBoundingClientRect();
      if(rect.width>0&&rect.height>0)items.push({kind:'img',el,rect});
    });
    if(!items.length){alert('保存する文字がありません♡');return}

    const minX=Math.min(...items.map(o=>o.rect.left));
    const minY=Math.min(...items.map(o=>o.rect.top));
    const maxX=Math.max(...items.map(o=>o.rect.right));
    const maxY=Math.max(...items.map(o=>o.rect.bottom));
    const pad=8;
    const width=Math.max(1,Math.ceil(maxX-minX+pad*2));
    const height=Math.max(1,Math.ceil(maxY-minY+pad*2));
    const scale=Math.min(3,Math.max(1,window.devicePixelRatio||1));

    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(width*scale);
    canvas.height=Math.ceil(height*scale);
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.scale(scale,scale);
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,width,height);

    const loadImg=src=>new Promise((resolve,reject)=>{
      const im=new Image();
      im.onload=()=>resolve(im);
      im.onerror=reject;
      im.src=src;
    });

    for(const item of items){
      const x=item.rect.left-minX+pad;
      const y=item.rect.top-minY+pad;
      if(item.kind==='img'){
        try{
          const im=await loadImg(item.el.currentSrc||item.el.src);
          ctx.drawImage(im,x,y,item.rect.width,item.rect.height);
        }catch(e){console.warn(e)}
      }else{
        const style=getComputedStyle(item.node.parentElement||p);
        ctx.font=style.font;
        ctx.fillStyle=style.color||'#000';
        ctx.textBaseline='top';
        ctx.fillText(item.text,x,y);
      }
    }

    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob){alert('PNGの作成に失敗しました♡');return}
    const filename='image-text-preview.png';

    // スマホで共有保存できる場合はこちらを優先
    if(navigator.share && typeof File!=='undefined'){
      try{
        const file=new File([blob],filename,{type:'image/png'});
        if(!navigator.canShare || navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:'画像文字プレビュー'});
          return;
        }
      }catch(e){
        if(e&&e.name==='AbortError')return;
      }
    }

    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Safari / 一部スマホで download 属性が無視された場合のフォールバック
    setTimeout(()=>{
      const popup=window.open(url,'_blank');
      if(!popup)location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    },500);
  }catch(e){
    console.error(e);
    alert('画像保存に失敗しました♡ '+(e&&e.message?e.message:e));
  }
}
function projectMeta(){
  return{
    version:5,
    chars:[...state.chars],
    images:Object.fromEntries(state.chars.map(c=>[c,(state.images[c]||[]).map((d,i)=>{
      const mime=mimeOf(d);
      return{file:'project/images/'+encodeURIComponent(c)+'/'+String(i+1).padStart(3,'0')+'.'+extOf(mime),mime};
    })])),
    settings:{...state.settings},
    text:state.text||''
  }
}
function projectBundle(){
  return{...projectMeta(),images:Object.fromEntries(state.chars.map(c=>[c,[...(state.images[c]||[])]]))}
}
function dataBytes(data){
  const b64=data.split(',')[1]||'';
  const bin=atob(b64),u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return u
}
const zipCrcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=zipCrcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function u16(n){return Uint8Array.of(n&255,(n>>>8)&255)}
function u32(n){return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)}
function cat(...arrs){const n=arrs.reduce((s,a)=>s+a.length,0),o=new Uint8Array(n);let p=0;for(const a of arrs){o.set(a,p);p+=a.length}return o}
function zipMake(files){
  const local=[],central=[];let offset=0;
  const enc=new TextEncoder();
  for(const f of files){
    const name=enc.encode(f.name),data=f.data,crc=crc32(data);
    const lh=cat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data);
    local.push(lh);
    const ch=cat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name);
    central.push(ch);offset+=lh.length;
  }
  const cd=cat(...central),body=cat(...local);
  const end=cat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(body.length),u16(0));
  return new Blob([body,cd,end],{type:'application/zip'})
}
function zipFind(bytes,sig,start=0){for(let i=Math.max(0,start);i<=bytes.length-4;i++)if((bytes[i]|bytes[i+1]<<8|bytes[i+2]<<16|bytes[i+3]<<24)===sig)return i;return-1}
function rd16(b,o){return b[o]|(b[o+1]<<8)}
function rd32(b,o){return(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0}
async function zipRead(file){
  const b=new Uint8Array(await file.arrayBuffer()),eocd=(()=>{for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(rd32(b,i)===0x06054b50)return i;return-1})();
  if(eocd<0)throw Error('ZIP end record not found');
  const count=rd16(b,eocd+10),cdOffset=rd32(b,eocd+16),out={};let p=cdOffset;
  for(let n=0;n<count;n++){
    if(rd32(b,p)!==0x02014b50)throw Error('Invalid central directory');
    const flags=rd16(b,p+8),method=rd16(b,p+10),csize=rd32(b,p+20),usize=rd32(b,p+24),nl=rd16(b,p+28),el=rd16(b,p+30),cl=rd16(b,p+32),lo=rd32(b,p+42);
    const name=new TextDecoder().decode(b.slice(p+46,p+46+nl));p+=46+nl+el+cl;
    const lnl=rd16(b,lo+26),lel=rd16(b,lo+28),start=lo+30+lnl+lel,comp=b.slice(start,start+csize);
    let data=comp;
    if(method===8){
      if(typeof DecompressionStream==='undefined')throw Error('このブラウザはZIP圧縮展開に対応していません');
      const ds=new DecompressionStream('deflate-raw');
      data=new Uint8Array(await new Response(new Blob([comp]).stream().pipeThrough(ds)).arrayBuffer());
    }else if(method!==0)throw Error('未対応ZIP圧縮方式');
    if(usize!==data.length&&method===0)throw Error('ZIPサイズ確認失敗');
    out[name]=data;
  }
  return out
}
function textBytes(s){return new TextEncoder().encode(s)}
async function txt(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path);return r.text()}
async function siteSources(){
  if(window.__SITE_SOURCES__)return window.__SITE_SOURCES__;
  return{index:await txt('index.html'),styles:await txt('styles.css'),app:await txt('app.js')};
}
function siteSourceText(s){return 'window.__SITE_SOURCES__='+JSON.stringify({index:s.index,styles:s.styles,app:s.app})+';'}
async function exportProject(){
  try{
    const p=projectBundle(),meta=projectMeta(),s=await siteSources(),files=[
      {name:'index.html',data:textBytes(s.index)},
      {name:'styles.css',data:textBytes(s.styles)},
      {name:'app.js',data:textBytes(s.app)},
      {name:'project-data.js',data:textBytes('window.__BUNDLED_PROJECT__='+JSON.stringify(p)+';')},
      {name:'site-source.js',data:textBytes(siteSourceText(s))},
      {name:'project/project.json',data:textBytes(JSON.stringify(meta,null,2))},
      {name:'README.txt',data:textBytes('画像ファイルを実体として同梱した持ち運び用プロジェクトです。\n展開後は index.html を開いてください。\n')}
    ];
    for(const c of state.chars)(state.images[c]||[]).forEach((d,i)=>files.push({name:meta.images[c][i].file,data:dataBytes(d)}));
    const blob=zipMake(files),u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download='image-text-tool-project.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
    alert('画像を含むZIPを作成したよ♡');
  }catch(e){console.error(e);alert('ZIP保存に失敗しました♡ '+e.message)}
}
async function importProject(f){
  try{
    const files=await zipRead(f),pj=files['project/project.json'];
    if(!pj)throw Error('project/project.json がありません');
    const meta=JSON.parse(new TextDecoder().decode(pj)),base=normalizeState({...meta,images:{}});
    for(const ch of base.chars){
      base.images[ch]=[];
      for(const entry of (meta.images?.[ch]||[])){
        if(typeof entry==='string'&&entry.startsWith('data:')){base.images[ch].push(entry);continue}
        const raw=files[entry.file];if(!raw)continue;
        let bin='';for(let i=0;i<raw.length;i++)bin+=String.fromCharCode(raw[i]);
        base.images[ch].push('data:'+(entry.mime||'image/png')+';base64,'+btoa(bin));
      }
    }
    state=base;await save();syncUI();$('text').value=state.text;renderChars();renderKeyboard();render();alert('画像ファイルごと復元したよ♡');
  }catch(e){console.error(e);alert('ZIPの読み込みに失敗しました♡ '+e.message)}
}

$('randomImage').onchange=readUI;$('randomSize').onchange=readUI;$('autoCap').onchange=readUI;$('normalize').onchange=readUI;$('normW').onchange=readUI;$('normH').onchange=readUI;$('normMode').onchange=readUI;$('sizeMin').onchange=readUI;$('sizeMax').onchange=readUI;$('spacing').oninput=readUI;$('renorm').onclick=renorm;
$('text').oninput=e=>{state.text=e.target.value;render();waitSave()};$('savePng').onclick=exportPreviewPNG;$('copyText').onclick=async()=>{await navigator.clipboard.writeText(state.text||'');alert('コピーしたよ♡')};$('clearText').onclick=()=>{$('text').value='';state.text='';render();waitSave()};$('reroll').onclick=render;$('printPdf').onclick=()=>window.print();
$('addChar').onclick=()=>$('modal').classList.remove('hidden');$('cancelAdd').onclick=()=>$('modal').classList.add('hidden');$('okAdd').onclick=()=>{const c=[...$('newChar').value.trim()][0];if(!c)return;if(state.chars.includes(c)){alert('その文字はすでに登録されています♡');return}state.chars.push(c);state.images[c]=[];$('newChar').value='';$('modal').classList.add('hidden');renderChars();renderKeyboard();waitSave()};
$('exportBtn').onclick=exportProject;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>e.target.files[0]&&importProject(e.target.files[0]);
$('resetBtn').onclick=async()=>{if(!confirm('保存データを削除する？'))return;await clearDB();state={chars:[...DEFAULT_CHARS],images:Object.fromEntries(DEFAULT_CHARS.map(c=>[c,[]])),settings:{...DEFAULT_SETTINGS},text:''};$('text').value='';syncUI();renderChars();renderKeyboard();render()};
(async()=>{try{if(!window.__BUNDLED_PROJECT__){const s=await load();if(s)state=normalizeState(s)}else state=normalizeState(state)}catch(e){console.error(e)}$('text').value=state.text;syncUI();renderChars();renderKeyboard();render()})();