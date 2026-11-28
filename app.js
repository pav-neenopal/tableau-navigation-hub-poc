/* Navigation Hub POC - Tableau Dashboard Extension */
'use strict';
const $ = (id) => document.getElementById(id);
const state = { rows: [], sectors: [], activeSector: '', status: 'All', worksheetName: '', images: {}, pendingImageLink: '' };
let isAuthoring=false;
document.body.classList.add('viewer');
const DEFAULT_THEME={title:{text:'Navigation Hub',color:'',font:'',size:26,w:null,h:null},desc:{text:'',color:'',font:'',size:14,w:null,h:null},logo:{src:'',w:null,h:56},header:{radius:10,height:null,padding:16,outer:0},summary:{radius:10,height:null,padding:12,outer:0,bg:''},tile:{w:null,h:null,bg:''},tileTitle:{},tileNum:{},tabs:{},headings:{},headerBg:'',pageBg:''};
state.cardStyles={};
function styleStr(s){s=s||{};const p=[];if(s.color)p.push('color:'+s.color);if(s.font)p.push('font-family:'+s.font);if(s.size)p.push('font-size:'+s.size+'px');return escapeHtml(p.join(';'));}
state.theme=JSON.parse(JSON.stringify(DEFAULT_THEME));
function px(v){return (v||v===0)?v+'px':'';}
function applyTheme(){
  const t=state.theme,r=document.documentElement.style;
  const te=$('appTitle');te.textContent=t.title.text||DEFAULT_THEME.title.text;
  te.style.color=t.title.color||'';te.style.fontFamily=t.title.font||'';te.style.fontSize=px(t.title.size||26);
  $('titleBox').style.width=px(t.title.w);$('titleBox').style.height=px(t.title.h);
  const d=t.desc,de=$('appDesc'),db=$('descBox');
  de.textContent=d.text||(isAuthoring?'Add description':'');de.classList.toggle('placeholder',!d.text);
  de.style.color=d.color||'';de.style.fontFamily=d.font||'';de.style.fontSize=px(d.size||14);
  db.style.width=px(d.w);db.style.height=px(d.h);db.hidden=!d.text&&!isAuthoring;
  const has=!!t.logo.src,lb=$('logoBox');
  if(has)$('logoImg').src=t.logo.src;$('logoImg').hidden=!has;$('logoEmpty').hidden=has;$('logoRemoveBtn').hidden=!has;
  lb.hidden=!has&&!isAuthoring;lb.style.height=px(t.logo.h||56);lb.style.width=px(t.logo.w);
  const hb=$('headerBox');hb.style.borderRadius=px(t.header.radius);hb.style.height=px(t.header.height);hb.style.padding=px(t.header.padding);hb.style.margin=px(t.header.outer);
  const sb=$('summaryBox'),s=t.summary;sb.style.borderRadius=px(s.radius);sb.style.height=px(s.height);sb.style.padding=px(s.padding);sb.style.margin=px(s.outer)+' '+px(s.outer)+' '+(s.outer?px(s.outer):'15px');
  s.bg?r.setProperty('--summary-bg',s.bg):r.removeProperty('--summary-bg');
  t.headerBg?r.setProperty('--header-bg',t.headerBg):r.removeProperty('--header-bg');
  t.pageBg?r.setProperty('--page-bg',t.pageBg):r.removeProperty('--page-bg');
}
async function saveTheme(){
  if(!isAuthoring) throw new Error('Editing is only available in authoring mode.');
  tableau.extensions.settings.set('hub.theme',JSON.stringify(state.theme));
  await tableau.extensions.settings.saveAsync();
}
async function openDialog(payload){
  if(!isAuthoring) return null;
  try{
    const url=new URL('dialog.html',location.href).href;
    const opts={width:420,height:Math.min(780,payload.groups.reduce((s,g)=>s+(g.numsOnly?50:(g.colorOnly?120:(g.allowText?330:270)))+Math.ceil((g.nums||[]).length/2)*66,130))};
    if(tableau.DialogStyle) opts.dialogStyle=tableau.DialogStyle.Modal;
    const res=await tableau.extensions.ui.displayDialogAsync(url,JSON.stringify(payload),opts);
    return res?JSON.parse(res):null;
  }catch(e){ console.warn('Dialog closed or failed:',e); if(e&&e.errorCode&&e.errorCode!=='dialog-closed-by-user') $('dataState').textContent='Dialog error: '+e.message; return null; }
}
async function persist(){try{await saveTheme();}catch(e){alert('Could not save: '+e.message);}}
const WH=[{key:'w',label:'Width (px)'},{key:'h',label:'Height (px)'}];
async function editTitle(){
  const r=await openDialog({heading:'Edit title',groups:[{key:'title',label:'Title',allowText:true,nums:WH,values:state.theme.title}]});
  if(r){state.theme.title=Object.assign({},state.theme.title,r.title);applyTheme();persist();}
}
async function editDesc(){
  const r=await openDialog({heading:'Edit description',groups:[{key:'desc',label:'Description',allowText:true,nums:WH,values:state.theme.desc}]});
  if(r){state.theme.desc=Object.assign({},state.theme.desc,r.desc);if(!r.desc.text)state.theme.desc.text='';applyTheme();persist();}
}
async function editLogoSize(){
  const r=await openDialog({heading:'Logo size',groups:[{key:'logo',label:'Logo container',numsOnly:true,nums:WH,values:state.theme.logo}]});
  if(r){state.theme.logo=Object.assign({},state.theme.logo,r.logo);applyTheme();persist();}
}
async function editHeader(){
  const r=await openDialog({heading:'Header layout',groups:[{key:'header',label:'Header container',numsOnly:true,nums:[{key:'radius',label:'Corner rounding (px)'},{key:'height',label:'Height (px)'},{key:'padding',label:'Inner padding (px)'},{key:'outer',label:'Outer padding (px)'}],values:state.theme.header}]});
  if(r){state.theme.header=Object.assign({},state.theme.header,r.header);applyTheme();persist();}
}
async function editSummary(){
  const r=await openDialog({heading:'Summary layout',groups:[{key:'summary',label:'Summary container',numsOnly:true,nums:[{key:'radius',label:'Corner rounding (px)'},{key:'height',label:'Height (px)'},{key:'padding',label:'Inner padding (px)'},{key:'outer',label:'Outer padding (px)'}],values:state.theme.summary},{key:'sbg',label:'Background',colorOnly:true,fallback:'#ffffff',values:{color:state.theme.summary.bg}}]});
  if(r){state.theme.summary=Object.assign({},state.theme.summary,r.summary,{bg:r.sbg.color});applyTheme();persist();}
}
async function editTile(){
  const r=await openDialog({heading:'Tile size',groups:[{key:'tile',label:'All tiles',numsOnly:true,nums:WH,values:state.theme.tile},{key:'tbg',label:'Tile background',colorOnly:true,fallback:'#ffffff',values:{color:state.theme.tile.bg}}]});
  if(r){state.theme.tile=Object.assign({},state.theme.tile,r.tile,{bg:r.tbg.color});render();persist();}
}
async function logoFromFile(file){
  if(!isAuthoring||!file)return;
  try{
    const data=await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(file);});
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data;});
    const s=Math.min(1,400/img.width,200/img.height);const cv=document.createElement('canvas');cv.width=Math.round(img.width*s);cv.height=Math.round(img.height*s);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    state.theme.logo=Object.assign({},state.theme.logo,{src:cv.toDataURL('image/png')});applyTheme();persist();
  }catch(e){alert('Logo could not be saved: '+e.message);}
}
async function editColor(key,heading,fallback){
  const r=await openDialog({heading,groups:[{key:'c',label:heading,colorOnly:true,fallback,values:{color:state.theme[key]}}]});
  if(r){state.theme[key]=r.c.color;applyTheme();persist();}
}
async function editTextStyle(key,heading){
  const r=await openDialog({heading,groups:[{key:'t',label:heading,values:state.theme[key]}]});
  if(r){state.theme[key]=r.t;render();persist();}
}
async function editCard(link){
  const cs=state.cardStyles[link]||{};
  const r=await openDialog({heading:'Format card',groups:[{key:'name',label:'Card name',values:cs.name},{key:'status',label:'Status text',values:cs.status},{key:'bg',label:'Card background',colorOnly:true,fallback:'#ffffff',values:{color:cs.bg}}]});
  if(r){state.cardStyles[link]={name:r.name,status:r.status,bg:r.bg.color};render();
    try{if(!isAuthoring)throw new Error('Editing is only available in authoring mode.');tableau.extensions.settings.set('hub.cards',JSON.stringify(state.cardStyles));await tableau.extensions.settings.saveAsync();}catch(e){alert('Could not save: '+e.message);}}
}
const FIELDS = ['Dashboard Tab Name','Dashboard Category','Dashboard Name','Dashboard Link','Status'];

function T(p,ms,l){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timed out ('+l+')')),ms))]);}
function norm(v){ return String(v ?? '').trim(); }
function safeLink(u){u=norm(u);return /^https?:\/\//i.test(u)?u:'#';}
function safeText(v){ return norm(v); }
function fieldIndex(columns, expected){
  const target = expected.toLowerCase().replace(/[^a-z0-9]/g,'');
  const clean=x=>norm(x).toLowerCase().replace(/[^a-z0-9]/g,'');
  return columns.findIndex(c => [c.fieldName,c.caption,c.name].some(x => clean(x)===target || clean(x).replace(/^(attrsumminmaxagg)/,'')===target));
}
function tableRows(table){
  const cols = table.columns || [];
  const idx = Object.fromEntries(FIELDS.map(f => [f, fieldIndex(cols,f)]));
  const missing = FIELDS.filter(f => idx[f] < 0);
  if(missing.length) throw new Error('Worksheet is missing required fields: ' + missing.join(', '));
  const out = (table.data || []).map(row => {
    const vals = row.map(cell => cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell);
    const obj = {};
    FIELDS.forEach(f => obj[f] = norm(vals[idx[f]]));
    obj['Dashboard Tab Name'] ||= 'Dashboards';
    obj['Dashboard Category'] ||= 'General';
    obj.Status = normalizeStatus(obj.Status);
    return obj;
  }).filter(r => r['Dashboard Name'] && r['Dashboard Link']);
  const canon = {};
  out.forEach(r => { const k = r.Status.toLowerCase(); r.Status = canon[k] || (canon[k] = r.Status); });
  return out;
}
function normalizeStatus(s){ return norm(s)||'No status'; }
const KNOWN_STATUS={live:['#e6f4ea','#287443'],development:['#fff2d9','#916000'],review:['#e8edff','#4058a8']};
const STATUS_PALETTE=[['#fde8e8','#a12d2d'],['#e0f5f5','#17696b'],['#f1e8fd','#6b3fa0'],['#fdeaf3','#a1346b'],['#eef2dc','#5b6b1e'],['#e8eef5','#3d5069']];
function statusInline(s){
  const k=String(s).toLowerCase().replace(/[^a-z]/g,'');
  let c=KNOWN_STATUS[k]||(k==='inreview'||k==='qc'?KNOWN_STATUS.review:null)||(k==='dev'||k==='indevelopment'?KNOWN_STATUS.development:null)||(k==='published'||k==='production'?KNOWN_STATUS.live:null);
  if(!c){let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;c=STATUS_PALETTE[h%STATUS_PALETTE.length];}
  return escapeHtml('background:'+c[0]+';color:'+c[1]);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusClass(s){return s.toLowerCase().replace(/[^a-z]/g,'');}
function groupBy(arr,key){return arr.reduce((a,r)=>((a[r[key]] ||= []).push(r),a),{});}
function imageFor(row){return state.images[row['Dashboard Link']] || '';}
function renderSummary(rows){
  const t=state.theme,box=$('summaryBox');
  box.hidden=!state.rows.length;
  const statuses=[...new Set(rows.map(r=>r.Status))];
  const items=[['Total',rows.length],...statuses.map(s=>[s,rows.filter(r=>r.Status===s).length])];
  const w=t.tile.w,ts=[w?'flex:0 0 '+w+'px':'',t.tile.h?'height:'+t.tile.h+'px':'',t.tile.bg?'background:'+t.tile.bg:''].filter(Boolean).join(';');
  $('summaryTiles').innerHTML=items.map(([lab,n])=>`<div class="sum-tile hdr-box" data-label="Tile" style="${escapeHtml(ts)}"><div class="sum-title hdr-box" data-label="Tile title" style="${styleStr(t.tileTitle)}"><span>${escapeHtml(lab)}</span><span class="hdr-tools author-only"><button data-sum="tileTitle" title="Edit title text">✎</button></span></div><div class="sum-num hdr-box" data-label="Tile number" style="${styleStr(t.tileNum)}"><span>${n} ${n===1?'dashboard':'dashboards'}</span><span class="hdr-tools author-only"><button data-sum="tileNum" title="Edit number text">✎</button></span></div><span class="hdr-tools author-only"><button data-sum="size" title="Tile size and background">✎</button></span></div>`).join('');
}
function render(){
  const sectors = [...new Set(state.rows.map(r=>r['Dashboard Tab Name']).filter(Boolean))];
  state.sectors = sectors;
  if(!sectors.includes(state.activeSector)) state.activeSector = sectors[0] || '';
  $('sectorTabs').innerHTML = sectors.map(s=>`<button class="sector-tab ${s===state.activeSector?'active':''}" data-sector="${escapeHtml(s)}" style="${styleStr(state.theme.tabs)}">${escapeHtml(s)}</button>`).join('')+'<button class="edit-btn author-only" data-edit-tabs title="Edit tab text">✎</button>';
  $('sectorTabs').querySelectorAll('[data-sector]').forEach(b=>b.addEventListener('click',()=>{state.activeSector=b.dataset.sector;render();}));
  const et=$('sectorTabs').querySelector('[data-edit-tabs]');if(et)et.addEventListener('click',()=>editTextStyle('tabs','Tab text'));
  const secRows=state.rows.filter(r=>r['Dashboard Tab Name']===state.activeSector);
  const statuses=[...new Set(secRows.map(r=>r.Status))];
  if(state.status!=='All'&&!statuses.includes(state.status)) state.status='All';
  $('statusFilter').innerHTML=['All',...statuses].map(s=>`<button class="filter-chip ${s===state.status?'active':''}" data-status="${escapeHtml(s)}">${s==='All'?'All statuses':escapeHtml(s)}</button>`).join('');
  $('statusFilter').querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.status;render();}));
  renderSummary(secRows);
  let rows=secRows;
  if(state.status!=='All') rows=rows.filter(r=>r.Status===state.status);
  const cats=groupBy(rows,'Dashboard Category');
  if(!rows.length){$('dashboardContent').innerHTML='<div class="empty-state">No dashboards match this selection.</div>';return;}
  $('dashboardContent').innerHTML=Object.entries(cats).map(([cat,items])=>`<section><div class="category-heading" style="${styleStr(state.theme.headings)}">${escapeHtml(cat)} <button class="edit-btn author-only" data-edit-headings title="Edit heading text">✎</button></div><div class="card-grid">${items.map(cardHtml).join('')}</div></section>`).join('');
  $('dashboardContent').querySelectorAll('[data-edit-headings]').forEach(b=>b.addEventListener('click',()=>editTextStyle('headings','Category heading text')));
  $('dashboardContent').querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>editCard(b.dataset.format)));
  $('dashboardContent').querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>chooseImage(b.dataset.image)));
  $('dashboardContent').querySelectorAll('[data-remove-image]').forEach(b=>b.addEventListener('click',()=>removeImage(b.dataset.removeImage)));
}
function cardHtml(r){
  const cs=state.cardStyles[r['Dashboard Link']]||{};const link=safeLink(r['Dashboard Link']); const img=imageFor(r); const title=r['Dashboard Name'];
  const status=r.Status;
  return `<article class="dashboard-card" style="${cs.bg?'background:'+escapeHtml(cs.bg):''}"><a class="preview" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(title)}">${img?`<img src="${img}" alt="${escapeHtml(title)} preview" />`:`<span class="image-empty">${isAuthoring?'<span class="plus">＋</span><span>Add dashboard image</span>':'<span>No preview</span>'}</span>`}</a><div class="card-body"><div class="card-title" style="${styleStr(cs.name)}">${escapeHtml(title)}</div><div class="card-bottom"><span class="status ${statusClass(status)}" style="${statusInline(status)};${styleStr(cs.status)}">${escapeHtml(status)}</span><a class="open-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open dashboard ↗</a></div></div>${isAuthoring?`<div class="card-actions"><button data-format="${escapeHtml(link)}">Format</button><button data-image="${escapeHtml(link)}">${img?'Replace image':'Add image'}</button>${img?`<button data-remove-image="${escapeHtml(link)}">Remove</button>`:''}</div>`:''}</article>`;
}
function showConfig(){ $('configPanel').hidden=false; if(window.tableau?.extensions?.dashboardContent) loadWorksheetList(); }
function setMessage(s){$('configMessage').textContent=s;}
async function loadWorksheetData(name){
  const dash=tableau.extensions.dashboardContent.dashboard;
  const ws=dash.worksheets.find(w=>w.name===name);
  if(!ws) throw new Error('Worksheet not found: '+name);
  $('dataState').textContent='Reading '+name+'…';
  let data; const errs=[]; const t0=Date.now();
  const tick=setInterval(()=>{ if($('dataState').textContent.startsWith('[build 6]')) $('dataState').textContent=$('dataState').textContent.replace(/ \(\d+s\)$/,'')+' ('+Math.round((Date.now()-t0)/1000)+'s)'; },1000);
  const methods=[
    ['summary data', async()=>T(ws.getSummaryDataAsync({ignoreSelection:true}),8000,'summary')],
    ['data source logical table', async()=>{const ds=(await T(ws.getDataSourcesAsync(),8000,'getDataSources'))[0];const lts=await T(ds.getLogicalTablesAsync(),8000,'getLogicalTables');return T(ds.getLogicalTableDataAsync(lts[0].id,{maxRows:1000}),8000,'logicalTableData');}],
    ['underlying table', async()=>{const tb=await T(ws.getUnderlyingTablesAsync(),8000,'getUnderlyingTables');return T(ws.getUnderlyingTableDataAsync(tb[0].id,{maxRows:1000}),8000,'underlyingData');}]
  ];
  for(const [label,fn] of methods){
    try{ $('dataState').textContent='[build 6] Reading '+name+' via '+label+'…'; data=await fn(); if(data&&data.data){ break; } }
    catch(e){ errs.push(label+': '+e.message); console.error(label,e); }
  }
  clearInterval(tick);
  if(!data) throw new Error('All read methods failed: '+errs.join(' | '));
  state.rows=tableRows(data);state.worksheetName=name;render();$('dataState').textContent=`${state.rows.length} dashboards • ${name}`;
}
async function loadWorksheetList(){
  const select=$('worksheetSelect'); select.innerHTML='';
  const ws=tableau.extensions.dashboardContent.dashboard.worksheets;
  ws.forEach(w=>{const o=document.createElement('option');o.value=w.name;o.textContent=w.name;select.appendChild(o);});
  if(!ws.length) setMessage('No worksheets found on this dashboard. Drag your directory worksheet onto the dashboard (it can be floating and tiny), then click Configure again.');
  else setMessage('');
  if(state.worksheetName) select.value=state.worksheetName;
}
async function initTableau(){
  if(!window.tableau?.extensions){$('dataState').textContent='Tableau API unavailable (open inside Tableau or use local preview).';return;}
  try{
    await tableau.extensions.initializeAsync();
    state.images=JSON.parse(tableau.extensions.settings.get('hub.images')||'{}');
    try{const t=JSON.parse(tableau.extensions.settings.get('hub.theme')||'{}');state.theme=Object.assign({},DEFAULT_THEME,t);['title','desc','logo','header','summary','tile'].forEach(k=>{state.theme[k]=Object.assign({},DEFAULT_THEME[k],t[k]||{});});}catch(e){}
    try{state.cardStyles=JSON.parse(tableau.extensions.settings.get('hub.cards')||'{}');}catch(e){}
    applyTheme();
    state.worksheetName=tableau.extensions.settings.get('hub.worksheet')||'';
    isAuthoring=tableau.extensions.environment.mode==='authoring';
    document.body.classList.toggle('viewer',!isAuthoring);
    $('configureBtn').hidden=!isAuthoring;
    await loadWorksheetList();
    if(state.worksheetName) await loadWorksheetData(state.worksheetName);
    else if(isAuthoring){showConfig();$('dataState').textContent='Choose the directory worksheet in Configure.';}
    else $('dataState').textContent='Not configured yet. Please contact the workbook author.';
  }catch(e){console.error(e);$('dataState').textContent='Tableau initialization failed: '+e.message;}
}
async function saveImages(){
  if(!isAuthoring) throw new Error('Editing is only available in authoring mode.');
  tableau.extensions.settings.set('hub.images',JSON.stringify(state.images));
  await tableau.extensions.settings.saveAsync();
}
function chooseImage(link){
  if(!isAuthoring) return;
  state.pendingImageLink=link;$('imagePicker').value='';$('imagePicker').click();
}
async function compressImage(file){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data;});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  let sx=0,sy=0,sw=img.width,sh=Math.round(img.width*9/16);
  if(sh>img.height){sh=img.height;sw=Math.round(sh*16/9);sx=Math.round((img.width-sw)/2);}
  const ctx=canvas.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,640,360);return canvas.toDataURL('image/jpeg',0.78);
}
async function removeImage(link){delete state.images[link];try{await saveImages();render();}catch(e){alert('Could not save image settings: '+e.message);}}
$('configureBtn').addEventListener('click',showConfig);
$('editTitleBtn').addEventListener('click',editTitle);
$('editDescBtn').addEventListener('click',editDesc);
$('headerLayoutBtn').addEventListener('click',editHeader);
$('logoSizeBtn').addEventListener('click',editLogoSize);
$('logoUploadBtn').addEventListener('click',()=>{if(isAuthoring){$('logoPicker').value='';$('logoPicker').click();}});
$('logoEmpty').addEventListener('click',()=>$('logoUploadBtn').click());
$('logoPicker').addEventListener('change',e=>logoFromFile(e.target.files&&e.target.files[0]));
$('logoRemoveBtn').addEventListener('click',()=>{state.theme.logo=Object.assign({},state.theme.logo,{src:''});applyTheme();persist();});
$('headerColorBtn').addEventListener('click',()=>editColor('headerBg','Header color','#ffffff'));
$('bgColorBtn').addEventListener('click',()=>editColor('pageBg','Page background color','#f5f7fa'));
$('closeConfig').addEventListener('click',()=>$('configPanel').hidden=true);
$('saveWorksheetBtn').addEventListener('click',async()=>{
  const name=$('worksheetSelect').value;if(!name)return;
  try{await loadWorksheetData(name);tableau.extensions.settings.set('hub.worksheet',name);await tableau.extensions.settings.saveAsync();setMessage('Worksheet saved to this workbook.');}
  catch(e){setMessage(e.message);console.error(e);}
});
$('refreshBtn').addEventListener('click',async()=>{try{await loadWorksheetList();if(state.worksheetName)await loadWorksheetData(state.worksheetName);else showConfig();}catch(e){$('dataState').textContent=e.message;}});
$('summaryBox').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='summaryLayoutBtn')return editSummary();
  const k=b.dataset.sum;if(k==='size')editTile();else if(k==='tileTitle')editTextStyle('tileTitle','Tile title text');else if(k==='tileNum')editTextStyle('tileNum','Tile number text');});
$('imagePicker').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file||!state.pendingImageLink)return;if(file.size>12*1024*1024){alert('Choose an image smaller than 12 MB.');return;}try{state.images[state.pendingImageLink]=await compressImage(file);await saveImages();render();}catch(err){alert('Image could not be saved. Try a smaller JPG or PNG. '+err.message);}});
initTableau();

(function(){
  const pre=document.createElement('pre');pre.id='diag';pre.style.cssText='font-size:11px;white-space:pre-wrap;background:#f5f5f5;padding:8px;margin-top:8px;max-height:260px;overflow:auto';
  const btn=document.createElement('button');btn.textContent='Run diagnostics';btn.className='secondary';btn.style.marginTop='8px';
  $('configPanel').appendChild(btn);$('configPanel').appendChild(pre);
  const log=s=>{pre.textContent+=s+'\n';};
  btn.addEventListener('click',async()=>{
    pre.textContent='';const t0=Date.now();const el=()=>'['+Math.round((Date.now()-t0)/1000)+'s] ';
    try{
      const ext=tableau.extensions;log(el()+'mode='+ext.environment.mode+' tableau='+ext.environment.tableauVersion+' apiVersion='+ext.environment.apiVersion+' context='+ext.environment.context);
      const dash=ext.dashboardContent.dashboard;log(el()+'worksheets: '+dash.worksheets.map(w=>w.name).join(', '));
      const ws=dash.worksheets.find(w=>w.name===$('worksheetSelect').value)||dash.worksheets[0];log(el()+'using '+ws.name);
      const steps=[
        ['getDataSourcesAsync',async()=>{const d=await T(ws.getDataSourcesAsync(),8000,'x');window._ds=d;return d.map(x=>x.name).join(', ');}],
        ['getLogicalTablesAsync',async()=>{const l=await T(window._ds[0].getLogicalTablesAsync(),8000,'x');window._lt=l;return l.map(x=>x.caption+'#'+x.id).join(', ');}],
        ['getLogicalTableDataAsync',async()=>{const d=await T(window._ds[0].getLogicalTableDataAsync(window._lt[0].id,{maxRows:5}),8000,'x');return 'cols='+d.columns.map(c=>c.fieldName).join('|')+' rows='+d.data.length;}],
        ['getSummaryDataAsync',async()=>{const d=await T(ws.getSummaryDataAsync({ignoreSelection:true}),8000,'x');return 'cols='+d.columns.map(c=>c.fieldName).join('|')+' rows='+d.data.length;}],
        ['getUnderlyingTablesAsync',async()=>{const t=await T(ws.getUnderlyingTablesAsync(),8000,'x');window._ut=t;return t.map(x=>x.caption+'#'+x.id).join(', ');}],
        ['getUnderlyingTableDataAsync',async()=>{const d=await T(ws.getUnderlyingTableDataAsync(window._ut[0].id,{maxRows:5}),8000,'x');return 'cols='+d.columns.map(c=>c.fieldName).join('|')+' rows='+d.data.length;}]
      ];
      for(const [n,f] of steps){try{log(el()+n+' ... ');log('   OK: '+await f());}catch(e){log('   FAIL: '+e.message);}}
      log(el()+'done');
    }catch(e){log('ERROR: '+e.message);}
  });
})();
