'use strict';
const FONTS=[['Default',''],['Tableau Book','Tableau Book, Segoe UI, Arial, sans-serif'],['Tableau Light','Tableau Light, Segoe UI Light, Arial, sans-serif'],['Tableau Medium','Tableau Medium, Segoe UI, Arial, sans-serif'],['Tableau Semibold','Tableau Semibold, Segoe UI Semibold, Arial, sans-serif'],['Tableau Bold','Tableau Bold, Segoe UI, Arial, sans-serif'],['Arial','Arial, sans-serif'],['Courier New','Courier New, monospace'],['Georgia','Georgia, serif'],['Times New Roman','Times New Roman, serif'],['Trebuchet MS','Trebuchet MS, sans-serif'],['Verdana','Verdana, sans-serif']];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
tableau.extensions.initializeDialogAsync().then(op=>{
  const p=JSON.parse(op);$('heading').textContent=p.heading||'Edit';
  let html='';
  p.groups.forEach((g,i)=>{const v=g.values||{};const id='g'+i;
    html+='<fieldset><legend>'+esc(g.label)+'</legend>';
    if(g.allowText) html+='<label>Text</label><input id="'+id+'t" type="text" value="'+esc(v.text)+'">';
    html+='<label>Color</label><div class="crow"><input id="'+id+'c" type="color" value="'+(v.color||g.fallback||'#1f2937')+'"'+(v.color?'':' disabled')+'><label class="chk"><input id="'+id+'d" type="checkbox"'+(v.color?'':' checked')+'> Default</label></div>';
    if(!g.colorOnly){
      html+='<label>Font</label><select id="'+id+'f">'+FONTS.map(f=>'<option value="'+esc(f[1])+'"'+(f[1]===(v.font||'')?' selected':'')+'>'+f[0]+'</option>').join('')+'</select>';
      html+='<label>Size (px)</label><input id="'+id+'s" type="number" min="8" max="72" placeholder="Default" value="'+esc(v.size)+'">';
    }
    html+='</fieldset>';
  });
  $('fields').innerHTML=html;
  p.groups.forEach((g,i)=>{const id='g'+i;$(id+'d').onchange=()=>{$(id+'c').disabled=$(id+'d').checked;};});
  $('cancel').onclick=()=>tableau.extensions.ui.closeDialog('');
  $('save').onclick=()=>{
    const out={};
    p.groups.forEach((g,i)=>{const id='g'+i;const o={};
      o.color=$(id+'d').checked?'':$(id+'c').value;
      if(g.allowText) o.text=$(id+'t').value.trim()||(g.values&&g.values.text)||'';
      if(!g.colorOnly){o.font=$(id+'f').value;o.size=Number($(id+'s').value)||null;}
      out[g.key]=o;});
    tableau.extensions.ui.closeDialog(JSON.stringify(out));
  };
});
