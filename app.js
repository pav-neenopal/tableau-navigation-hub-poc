/* Navigation Hub POC - Tableau Dashboard Extension */
'use strict';
const $ = (id) => document.getElementById(id);
const state = { rows: [], sectors: [], activeSector: '', status: 'All', worksheetName: '', images: {}, pendingImageLink: '' };
let isAuthoring=false;
document.body.classList.add('viewer');
const DEFAULT_THEME={title:{text:'Navigation Hub',color:'',font:'',size:26},headerBg:'',pageBg:''};
state.theme=JSON.parse(JSON.stringify(DEFAULT_THEME));
function applyTheme(){
  const t=state.theme,el=$('appTitle');
  el.textContent=t.title.text||DEFAULT_THEME.title.text;
  el.style.color=t.title.color||'';el.style.fontFamily=t.title.font||'';el.style.fontSize=(t.title.size||26)+'px';
  const r=document.documentElement.style;
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
    const opts={width:360,height:payload.kind==='text'?460:260};
    if(tableau.DialogStyle) opts.dialogStyle=tableau.DialogStyle.Modal;
    const res=await tableau.extensions.ui.displayDialogAsync(url,JSON.stringify(payload),opts);
    return res?JSON.parse(res):null;
  }catch(e){ console.warn('Dialog closed or failed:',e); if(e&&e.errorCode&&e.errorCode!=='dialog-closed-by-user') $('dataState').textContent='Dialog error: '+e.message; return null; }
}
async function editTitle(){
  const r=await openDialog({kind:'text',allowText:true,heading:'Edit title',values:state.theme.title});
  if(r){state.theme.title=Object.assign({},state.theme.title,r);applyTheme();try{await saveTheme();}catch(e){alert('Could not save: '+e.message);}}
}
async function editColor(key,heading,fallback){
  const r=await openDialog({kind:'color',heading,values:{color:state.theme[key]||fallback}});
  if(r){state.theme[key]=r.color;applyTheme();try{await saveTheme();}catch(e){alert('Could not save: '+e.message);}}
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
  return (table.data || []).map(row => {
    const vals = row.map(cell => cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell);
    const obj = {};
    FIELDS.forEach(f => obj[f] = norm(vals[idx[f]]));
    obj['Dashboard Tab Name'] ||= 'Dashboards';
    obj['Dashboard Category'] ||= 'General';
    obj.Status = normalizeStatus(obj.Status);
    return obj;
  }).filter(r => r['Dashboard Name'] && r['Dashboard Link']);
}
function normalizeStatus(s){
  const v = norm(s).toLowerCase();
  if(['live','published','production'].includes(v)) return 'Live';
  if(['development','dev','in development'].includes(v)) return 'Development';
  if(['review','in review','qc'].includes(v)) return 'Review';
  return 'Review';
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusClass(s){return s.toLowerCase().replace(/[^a-z]/g,'');}
function groupBy(arr,key){return arr.reduce((a,r)=>((a[r[key]] ||= []).push(r),a),{});}
function imageFor(row){return state.images[row['Dashboard Link']] || '';}
function render(){
  const sectors = [...new Set(state.rows.map(r=>r['Dashboard Tab Name']).filter(Boolean))];
  state.sectors = sectors;
  if(!sectors.includes(state.activeSector)) state.activeSector = sectors[0] || '';
  $('sectorTabs').innerHTML = sectors.map(s=>`<button class="sector-tab ${s===state.activeSector?'active':''}" data-sector="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
  $('sectorTabs').querySelectorAll('[data-sector]').forEach(b=>b.addEventListener('click',()=>{state.activeSector=b.dataset.sector;render();}));
  let rows=state.rows.filter(r=>r['Dashboard Tab Name']===state.activeSector);
  if(state.status!=='All') rows=rows.filter(r=>r.Status===state.status);
  const cats=groupBy(rows,'Dashboard Category');
  if(!rows.length){$('dashboardContent').innerHTML='<div class="empty-state">No dashboards match this selection.</div>';return;}
  $('dashboardContent').innerHTML=Object.entries(cats).map(([cat,items])=>`<section><div class="category-heading">${escapeHtml(cat)}</div><div class="card-grid">${items.map(cardHtml).join('')}</div></section>`).join('');
  $('dashboardContent').querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>chooseImage(b.dataset.image)));
  $('dashboardContent').querySelectorAll('[data-remove-image]').forEach(b=>b.addEventListener('click',()=>removeImage(b.dataset.removeImage)));
}
function cardHtml(r){
  const link=safeLink(r['Dashboard Link']); const img=imageFor(r); const title=r['Dashboard Name'];
  const status=r.Status;
  return `<article class="dashboard-card"><a class="preview" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(title)}">${img?`<img src="${img}" alt="${escapeHtml(title)} preview" />`:`<span class="image-empty">${isAuthoring?'<span class="plus">＋</span><span>Add dashboard image</span>':'<span>No preview</span>'}</span>`}</a><div class="card-body"><div class="card-title">${escapeHtml(title)}</div><div class="card-bottom"><span class="status ${statusClass(status)}">${escapeHtml(status)}</span><a class="open-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open dashboard ↗</a></div></div>${isAuthoring?`<div class="card-actions"><button data-image="${escapeHtml(link)}">${img?'Replace image':'Add image'}</button>${img?`<button data-remove-image="${escapeHtml(link)}">Remove</button>`:''}</div>`:''}</article>`;
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
    try{const t=JSON.parse(tableau.extensions.settings.get('hub.theme')||'{}');state.theme=Object.assign({},DEFAULT_THEME,t,{title:Object.assign({},DEFAULT_THEME.title,t.title||{})});}catch(e){}
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
$('headerColorBtn').addEventListener('click',()=>editColor('headerBg','Header color','#ffffff'));
$('bgColorBtn').addEventListener('click',()=>editColor('pageBg','Page background color','#f5f7fa'));
$('closeConfig').addEventListener('click',()=>$('configPanel').hidden=true);
$('saveWorksheetBtn').addEventListener('click',async()=>{
  const name=$('worksheetSelect').value;if(!name)return;
  try{await loadWorksheetData(name);tableau.extensions.settings.set('hub.worksheet',name);await tableau.extensions.settings.saveAsync();setMessage('Worksheet saved to this workbook.');}
  catch(e){setMessage(e.message);console.error(e);}
});
$('refreshBtn').addEventListener('click',async()=>{try{await loadWorksheetList();if(state.worksheetName)await loadWorksheetData(state.worksheetName);else showConfig();}catch(e){$('dataState').textContent=e.message;}});
document.querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.status;document.querySelectorAll('.filter-chip').forEach(x=>x.classList.toggle('active',x===b));render();}));
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
