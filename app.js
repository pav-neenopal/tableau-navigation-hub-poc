/* Navigation Hub POC - Tableau Dashboard Extension */
'use strict';
const $ = (id) => document.getElementById(id);
const state = { rows: [], sectors: [], activeSector: '', status: 'All', worksheetName: '', images: {}, pendingImageLink: '' };
const FIELDS = ['Dashboard Tab Name','Dashboard Category','Dashboard Name','Dashboard Link','Status'];

function norm(v){ return String(v ?? '').trim(); }
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
  return `<article class="dashboard-card"><a class="preview" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(title)}">${img?`<img src="${img}" alt="${escapeHtml(title)} preview" />`:`<span class="image-empty"><span class="plus">＋</span><span>Add dashboard image</span></span>`}</a><div class="card-body"><div class="card-title">${escapeHtml(title)}</div><div class="card-bottom"><span class="status ${statusClass(status)}">${escapeHtml(status)}</span><a class="open-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open dashboard ↗</a></div></div><div class="card-actions"><button data-image="${escapeHtml(link)}">${img?'Replace image':'Add image'}</button>${img?`<button data-remove-image="${escapeHtml(link)}">Remove</button>`:''}</div></article>`;
}
function showConfig(){ $('configPanel').hidden=false; if(window.tableau?.extensions?.dashboardContent) loadWorksheetList(); }
function setMessage(s){$('configMessage').textContent=s;}
async function loadWorksheetData(name){
  const dash=tableau.extensions.dashboardContent.dashboard;
  const ws=dash.worksheets.find(w=>w.name===name);
  if(!ws) throw new Error('Worksheet not found: '+name);
  $('dataState').textContent='Reading '+name+'…';
  const data=await ws.getSummaryDataAsync({ignoreSelection:true});
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
    state.worksheetName=tableau.extensions.settings.get('hub.worksheet')||'';
    $('configureBtn').hidden=false;
    await loadWorksheetList();
    if(state.worksheetName) await loadWorksheetData(state.worksheetName);
    else {showConfig();$('dataState').textContent='Choose the directory worksheet in Configure.';}
    const mode=tableau.extensions.environment.mode;
    if(mode==='authoring') $('configureBtn').hidden=false;
  }catch(e){console.error(e);$('dataState').textContent='Tableau initialization failed: '+e.message;}
}
async function saveImages(){
  tableau.extensions.settings.set('hub.images',JSON.stringify(state.images));
  await tableau.extensions.settings.saveAsync();
}
function chooseImage(link){
  state.pendingImageLink=link;$('imagePicker').value='';$('imagePicker').click();
}
async function compressImage(file){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data;});
  const canvas=document.createElement('canvas');const maxW=640,maxH=360;const scale=Math.min(maxW/img.width,maxH/img.height,1);canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.78);
}
async function removeImage(link){delete state.images[link];try{await saveImages();render();}catch(e){alert('Could not save image settings: '+e.message);}}
$('configureBtn').addEventListener('click',showConfig);
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
