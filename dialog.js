'use strict';
const FONTS=[['Default',''],['Tableau Book','Tableau Book, Segoe UI, Arial, sans-serif'],['Tableau Light','Tableau Light, Segoe UI Light, Arial, sans-serif'],['Tableau Medium','Tableau Medium, Segoe UI, Arial, sans-serif'],['Tableau Semibold','Tableau Semibold, Segoe UI Semibold, Arial, sans-serif'],['Tableau Bold','Tableau Bold, Segoe UI, Arial, sans-serif'],['Arial','Arial, sans-serif'],['Courier New','Courier New, monospace'],['Georgia','Georgia, serif'],['Times New Roman','Times New Roman, serif'],['Trebuchet MS','Trebuchet MS, sans-serif'],['Verdana','Verdana, sans-serif']];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
tableau.extensions.initializeDialogAsync().then(op=>{
  const p=JSON.parse(op);$('heading').textContent=p.heading||'Edit';
  let html='';
  p.groups.forEach((g,i)=>{const v=g.values||{};const id='g'+i;
    html+='<div class="card"><h3>'+esc(g.label)+'</h3>';
    if(g.allowText) html+='<div class="field"><label>Text</label><input id="'+id+'t" type="text" value="'+esc(v.text)+'"></div>';
    if(!g.numsOnly){
      html+='<div class="grid"><div class="field"><label>Color</label><div class="crow"><input id="'+id+'c" type="color" value="'+(v.color||g.fallback||'#1f2937')+'"'+(v.color?'':' disabled')+'><label class="chk"><input id="'+id+'d" type="checkbox"'+(v.color?'':' checked')+'> Default</label></div></div>';
      if(!g.colorOnly) html+='<div class="field"><label>Size (px)</label><input id="'+id+'s" type="number" min="8" max="72" placeholder="Default" value="'+esc(v.size)+'"></div>';
      html+='</div>';
      if(!g.colorOnly){
        html+='<div class="field"><label>Font</label><select id="'+id+'f">'+FONTS.map(f=>'<option value="'+esc(f[1])+'"'+(f[1]===(v.font||'')?' selected':'')+'>'+f[0]+'</option>').join('')+'</select></div><div class="preview" id="'+id+'p">Sample text</div>';
      }
    }
    if(g.nums&&g.nums.length) html+='<div class="grid">'+g.nums.map(n=>'<div class="field"><label>'+esc(n.label)+'</label><input id="'+id+'n_'+n.key+'" type="number" min="0" placeholder="Auto" value="'+esc(v[n.key])+'"></div>').join('')+'</div>';
    html+='</div>';
  });
  $('fields').innerHTML=html;
  p.groups.forEach((g,i)=>{const id='g'+i;
    if($(id+'d')) $(id+'d').onchange=()=>{$(id+'c').disabled=$(id+'d').checked;upd();};
    if($(id+'c')) $(id+'c').oninput=upd;
    if($(id+'f')) $(id+'f').onchange=upd;
    if($(id+'s')) $(id+'s').oninput=upd;
    if($(id+'t')) $(id+'t').oninput=upd;
  });
  function upd(){p.groups.forEach((g,i)=>{const id='g'+i,pv=$(id+'p');if(!pv)return;
    pv.textContent=(g.allowText&&$(id+'t').value.trim())||'Sample text';
    pv.style.color=$(id+'d').checked?'':$(id+'c').value;
    pv.style.fontFamily=$(id+'f').value;
    pv.style.fontSize=Math.min(Number($(id+'s').value)||14,32)+'px';});}
  upd();
  $('cancel').onclick=()=>tableau.extensions.ui.closeDialog('');
  $('save').onclick=()=>{
    const out={};
    p.groups.forEach((g,i)=>{const id='g'+i;const o={};
      if(!g.numsOnly) o.color=$(id+'d').checked?'':$(id+'c').value;
      if(g.allowText) o.text=$(id+'t').value.trim()||(g.values&&g.values.text)||'';
      (g.nums||[]).forEach(n=>{const x=$(id+'n_'+n.key).value;o[n.key]=x===''?null:Number(x);});
      if(!g.colorOnly&&!g.numsOnly){o.font=$(id+'f').value;o.size=Number($(id+'s').value)||null;}
      out[g.key]=o;});
    tableau.extensions.ui.closeDialog(JSON.stringify(out));
  };
});
