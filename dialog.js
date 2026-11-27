'use strict';
const FONTS=[['Default',''],['Segoe UI','Segoe UI, Arial, sans-serif'],['Arial','Arial, sans-serif'],['Verdana','Verdana, sans-serif'],['Trebuchet MS','Trebuchet MS, sans-serif'],['Georgia','Georgia, serif'],['Times New Roman','Times New Roman, serif'],['Courier New','Courier New, monospace']];
const $=id=>document.getElementById(id);
tableau.extensions.initializeDialogAsync().then(openPayload=>{
  const p=JSON.parse(openPayload); const v=p.values||{};
  $('heading').textContent=p.heading||'Edit';
  let html='';
  if(p.kind==='text'){
    if(p.allowText) html+='<label>Text</label><input id="f_text" type="text" value="'+String(v.text||'').replace(/"/g,'&quot;')+'">';
    html+='<label>Color</label><input id="f_color" type="color" value="'+(v.color||'#1f2937')+'">';
    html+='<label>Font</label><select id="f_font">'+FONTS.map(f=>'<option value="'+f[1]+'"'+(f[1]===(v.font||'')?' selected':'')+'>'+f[0]+'</option>').join('')+'</select>';
    html+='<label>Size (px)</label><input id="f_size" type="number" min="8" max="72" value="'+(v.size||26)+'">';
  } else {
    html+='<label>Color</label><input id="f_color" type="color" value="'+(v.color||'#ffffff')+'">';
  }
  $('fields').innerHTML=html;
  $('cancel').onclick=()=>tableau.extensions.ui.closeDialog('');
  $('save').onclick=()=>{
    const out={color:$('f_color').value};
    if(p.kind==='text'){ out.font=$('f_font').value; out.size=Number($('f_size').value)||26; if(p.allowText) out.text=$('f_text').value.trim()||v.text; }
    tableau.extensions.ui.closeDialog(JSON.stringify(out));
  };
});
