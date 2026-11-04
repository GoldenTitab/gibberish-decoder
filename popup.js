(function () {
  'use strict';
  const DEFAULTS={enabled:true,showButton:true,warnBeforeSend:true,fixNumbers:true,fixZwnj:true,strictChatOnly:true,uiLang:'fa'};
  const ids=['enabled','showButton','warnBeforeSend','fixNumbers','fixZwnj','strictChatOnly'];
  const $=id=>document.getElementById(id);
  function getSettings(){const s={uiLang:$('uiLang').value};ids.forEach(id=>s[id]=$(id).checked);return s;}
  function save(){chrome.storage.local.set(getSettings());}
  chrome.storage.local.get(DEFAULTS,res=>{ids.forEach(id=>$(id).checked=res[id]!==false);$('uiLang').value=res.uiLang||'fa';ids.concat(['uiLang']).forEach(id=>$(id).addEventListener('change',save));});
  function run(mode){const input=$('testInput').value,settings=getSettings();let out='';if(mode==='fa')out=GDDecoder.convertEnToFa(input,settings);else if(mode==='en')out=GDDecoder.convertFaToEn(input,settings);else out=GDDecoder.analyze(input,settings).correctedText; $('testOutput').value=out;$('testIssues').textContent=''; }
  $('testAuto').addEventListener('click',()=>run('auto'));$('testFa').addEventListener('click',()=>run('fa'));$('testEn').addEventListener('click',()=>run('en'));
  $('copyOut').addEventListener('click',async()=>{const value=$('testOutput').value;try{await navigator.clipboard.writeText(value);$('copyStatus').textContent='کپی شد';}catch(e){$('testOutput').focus();$('testOutput').select();const ok=document.execCommand('copy');$('copyStatus').textContent=ok?'کپی شد':'کپی خودکار ممکن نبود';}});
})();