(function () {
  const DEFAULTS = { enabled: true, showButton: true, warnBeforeSend: true, fixNumbers: true, fixZwnj: true, spellEn: true, spellFa: true, strictChatOnly: true, uiLang: 'fa' };
  const ids = ['enabled', 'showButton', 'warnBeforeSend', 'fixNumbers', 'fixZwnj', 'spellEn', 'spellFa', 'strictChatOnly'];
  function getSettings() {
    const s = { uiLang: document.getElementById('uiLang').value };
    ids.forEach(function (id) { s[id] = document.getElementById(id).checked; });
    return s;
  }
  chrome.storage.local.get(DEFAULTS, function (res) {
    ids.forEach(function (id) { document.getElementById(id).checked = res[id] !== false; });
    document.getElementById('uiLang').value = res.uiLang || 'fa';
    ids.concat(['uiLang']).forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () { chrome.storage.local.set(getSettings()); });
    });
  });
  function run(mode) {
    const input = document.getElementById('testInput').value;
    const settings = getSettings();
    let out = '', issues = [];
    if (mode === 'fa') { out = GDDecoder.convertEnToFa(input, settings); }
    else if (mode === 'en') { out = GDDecoder.convertFaToEn(input, settings); }
    else { const r = GDDecoder.analyze(input, settings); out = r.correctedText; issues = r.issues; }
    document.getElementById('testOutput').value = out;
    const box = document.getElementById('testIssues');
    if (mode === 'auto') {
      box.textContent = issues.length ? issues.map(function (it) { return it.original + ' → ' + it.corrected + ' (' + it.type + ')'; }).join('\n') : 'مشکلی پیدا نشد.';
    } else { box.textContent = ''; }
  }
  document.getElementById('testAuto').addEventListener('click', function () { run('auto'); });
  document.getElementById('testFa').addEventListener('click', function () { run('fa'); });
  document.getElementById('testEn').addEventListener('click', function () { run('en'); });
  document.getElementById('copyOut').addEventListener('click', function () {
    const ta = document.getElementById('testOutput'); ta.select();
    try { document.execCommand('copy'); } catch (e) { navigator.clipboard && navigator.clipboard.writeText(ta.value); }
  });
})();
