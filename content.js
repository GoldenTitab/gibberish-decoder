/* Gibberish Decoder — content script.
   Attaches only to long chat composers (see isChatComposer), never to
   password / search / single-line inputs. All analysis runs locally in
   this page; no text is fetched, posted, or sent anywhere.
   Send guard: Enter (without Shift) is intercepted in the capture phase
   only when issues exist and warnBeforeSend is on. The panel then offers
   "Fix and send", which applies the fix and re-triggers the send. */
(function () {
  'use strict';
  const DEFAULTS = { enabled: true, showButton: true, warnBeforeSend: true, fixNumbers: true, fixZwnj: true, strictChatOnly: true, uiLang: 'fa' };
  let settings = Object.assign({}, DEFAULTS);
  let sendBypass = new WeakMap(); // element -> true while we re-trigger its send
  let dismissed = new WeakMap(); // element -> text the user chose to keep as is (Enter guard stays quiet for it)

  const STR = {
    fa: { btn: 'تبدیل متن', fixAll: 'اصلاح همه', close: 'بستن', fixSend: 'اصلاح و ارسال', keep: 'همین بمونه', layoutFa: 'کیبورد اشتباه: فارسی', layoutEn: 'کیبورد اشتباه: انگلیسی', zwnj: 'نیم‌فاصله', ambiguous: 'هر دو معنی می‌ده، انتخاب کن', apply: 'اعمال', title: 'Gibberish Decoder — پیشنهاد تبدیل' },
    en: { btn: 'Fix text', fixAll: 'Fix all', close: 'Close', fixSend: 'Fix and send', keep: 'Keep as is', layoutFa: 'Wrong layout: Persian', layoutEn: 'Wrong layout: English', zwnj: 'Half-space (ZWNJ)', ambiguous: 'Both make sense — pick one', apply: 'Apply', title: 'Gibberish Decoder — layout suggestions' }
  };
  function t(key) { return (STR[settings.uiLang] || STR.fa)[key] || key; }

  // Vazir for the injected UI. content.css alone cannot resolve a font
  // file inside a web page, so inject @font-face with the extension URL.
  // This needs fonts/* in web_accessible_resources (see manifest.json).
  function injectVazir() {
    try {
      if (document.getElementById('gd-vazir-style')) return;
      const weights = [[100, 'Vazir-Thin.ttf'], [300, 'Vazir-Light.ttf'], [400, 'Vazir.ttf'], [500, 'Vazir-Medium.ttf'], [700, 'Vazir-Bold.ttf']];
      let css = '';
      weights.forEach(function (w) {
        css += "@font-face { font-family: 'Vazir'; src: url('" + chrome.runtime.getURL('fonts/' + w[1]) + "') format('truetype'); font-weight: " + w[0] + "; font-display: swap; }\n";
      });
      const style = document.createElement('style');
      style.id = 'gd-vazir-style';
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}
  }
  injectVazir();

  function loadSettings(cb) {
    try {
      chrome.storage.local.get(DEFAULTS, function (res) { settings = Object.assign({}, DEFAULTS, res); if (cb) cb(); });
    } catch (e) { if (cb) cb(); }
  }
  try { chrome.storage.onChanged.addListener(function (changes, area) { if (area !== 'local') return; Object.keys(changes).forEach(function (k) { settings[k] = changes[k].newValue; }); removeUI(); }); } catch (e) {}

  function getText(el) {
    if (el.tagName === 'TEXTAREA') return el.value;
    return el.innerText !== undefined ? el.innerText : el.textContent;
  }
  function setText(el, newText) {
    if (el.tagName === 'TEXTAREA') {
      try {
        const proto = window.HTMLTextAreaElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) desc.set.call(el, newText); else el.value = newText;
      } catch (e) { el.value = newText; }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try { el.setSelectionRange(newText.length, newText.length); } catch (e) {}
      return;
    }
    el.focus();
    try {
      const sel = window.getSelection();
      sel.selectAllChildren(el);
      const ok = document.execCommand('insertText', false, newText);
      if (!ok) { el.textContent = newText; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
    } catch (e) {
      el.textContent = newText;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }
  function findSendButton(el) {
    let root = el.closest('form') || el.parentElement;
    for (let i = 0; i < 4 && root; i++) {
      const btn = root.querySelector('button[aria-label*="Send" i], button[aria-label*="ارسال"], button[data-testid*="send" i], button[title*="Send" i]');
      if (btn) return btn;
      root = root.parentElement;
    }
    return null;
  }
  function triggerSend(el) {
    const btn = findSendButton(el);
    if (btn) { setTimeout(function () { btn.click(); }, 30); return true; }
    try {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    } catch (e) {}
    return false;
  }

  function isChatComposer(el) {
    if (!el || el.disabled || el.readOnly) return false;
    const tag = el.tagName;
    if (el.closest('[role="search"], form[role="search"]')) return false;
    const label = ((el.getAttribute('aria-label') || '') + ' ' +
      (el.getAttribute('data-placeholder') || '') + ' ' +
      (el.getAttribute('placeholder') || '') + ' ' +
      (el.getAttribute('name') || '')).toLowerCase();
    const chatHint = /message|chat|prompt|ask|send|پیام|چت|متن پیام/.test(label);
    const chatAncestor = !!el.closest('[class*="chat" i], [class*="composer" i], [class*="prompt" i], [id*="chat" i], [id*="composer" i]');
    if (tag === 'TEXTAREA') {
      if (chatHint || chatAncestor) return true;
      return !settings.strictChatOnly;
    }
    if (el.isContentEditable) {
      if (el.closest('[role="search"]')) return false;
      if (el.getAttribute('role') === 'textbox') return true;
      if (chatHint) return true;
      if (chatAncestor) return true;
      if (!settings.strictChatOnly) {
        const h = el.getBoundingClientRect ? el.getBoundingClientRect().height : 0;
        if (h >= 40 && h <= 400) return true;
      }
      return false;
    }
    return false;
  }

  let floatBtn = null, panel = null, currentEl = null, currentAnalysis = null, sendMode = false;

  function removeUI() { if (floatBtn) { floatBtn.remove(); floatBtn = null; } if (panel) { panel.remove(); panel = null; } }
  function positionFloat(el) {
    if (!floatBtn) return;
    const r = el.getBoundingClientRect();
    floatBtn.style.left = Math.max(8, r.right - 130) + 'px';
    floatBtn.style.top = Math.max(8, r.top - 38) + 'px';
  }
  function showFloat(el, analysis) {
    if (!settings.enabled || !settings.showButton) return;
    currentEl = el; currentAnalysis = analysis;
    if (!floatBtn) {
      floatBtn = document.createElement('button');
      floatBtn.type = 'button';
      floatBtn.className = 'gd-float-btn';
      floatBtn.setAttribute('aria-label', t('btn'));
      floatBtn.setAttribute('aria-haspopup', 'dialog');
      floatBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); sendMode = false;
        if (currentEl && currentAnalysis) showPanel(currentEl, currentAnalysis, false);
      });
      document.body.appendChild(floatBtn);
    }
    floatBtn.textContent = t('btn') + ' (' + analysis.issues.length + ')';
    positionFloat(el);
    floatBtn.style.display = 'block';
  }
  function hideFloat() { if (floatBtn) floatBtn.style.display = 'none'; }

  function typeLabel(issue) {
    if (issue.type === 'layout-fa') return t('layoutFa');
    if (issue.type === 'layout-en') return t('layoutEn');
    if (issue.type === 'zwnj') return t('zwnj');
    return t('ambiguous');
  }
  function showPanel(el, analysis, isSend) {
    sendMode = isSend; currentEl = el; currentAnalysis = analysis;
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'gd-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', t('title'));
    panel.setAttribute('tabindex', '-1');
    panel.dir = settings.uiLang === 'fa' ? 'rtl' : 'ltr';
    const title = document.createElement('div'); title.className = 'gd-panel-title'; title.id = 'gd-panel-title'; panel.setAttribute('aria-labelledby', title.id); title.textContent = t('title'); panel.appendChild(title);
    const list = document.createElement('div'); list.className = 'gd-list';
    analysis.issues.forEach(function (issue, idx) {
      const row = document.createElement('div'); row.className = 'gd-row';
      const lab = document.createElement('div'); lab.className = 'gd-lab'; lab.textContent = typeLabel(issue); row.appendChild(lab);
      const txt = document.createElement('div'); txt.className = 'gd-txt';
      const o = document.createElement('span'); o.className = 'gd-orig'; o.textContent = issue.original;
      const arr = document.createElement('span'); arr.className = 'gd-arrow'; arr.textContent = ' → ';
      const c = document.createElement('span'); c.className = 'gd-corr'; c.textContent = issue.corrected;
      txt.appendChild(o); txt.appendChild(arr); txt.appendChild(c); row.appendChild(txt);
      const btns = document.createElement('div'); btns.className = 'gd-btns';
      if (issue.type === 'ambiguous') {
        issue.alternatives.forEach(function (alt) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'gd-mini'; b.textContent = alt; b.setAttribute('aria-label', t('apply') + ': ' + alt);
          b.addEventListener('click', function () { applyOne(idx, alt); });
          btns.appendChild(b);
        });
        const keep = document.createElement('button'); keep.type = 'button'; keep.className = 'gd-mini gd-keep'; keep.textContent = t('keep');
        keep.addEventListener('click', function () { dismissed.set(el, getText(el)); row.remove(); });
        btns.appendChild(keep);
      } else if (issue.alternatives && issue.alternatives.length > 1) {
        issue.alternatives.forEach(function (alt) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'gd-mini'; b.textContent = alt; b.setAttribute('aria-label', t('apply') + ': ' + alt);
          b.addEventListener('click', function () { applyOne(idx, alt); });
          btns.appendChild(b);
        });
      } else {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'gd-mini'; b.textContent = t('apply'); b.setAttribute('aria-label', t('apply') + ': ' + issue.corrected);
        b.addEventListener('click', function () { applyOne(idx, issue.corrected); });
        btns.appendChild(b);
      }
      row.appendChild(btns); list.appendChild(row);
    });
    panel.appendChild(list);
    const foot = document.createElement('div'); foot.className = 'gd-foot';
    const fixAll = document.createElement('button'); fixAll.type = 'button'; fixAll.className = 'gd-primary'; fixAll.textContent = t('fixAll');
    function doFix(thenSend) {
      // Use the analyser's correctedText, not a manual re-apply: it
      // already excludes ambiguous/likely/spelling items and includes the
      // post-layout ZWNJ restoration (می خواهم -> می‌خواهم).
      const fresh = window.GDDecoder.analyze(getText(el), settings);
      setText(el, fresh.correctedText);
      closePanel();
      if (thenSend) {
        sendBypass.set(el, true);
        setTimeout(function () { triggerSend(el); sendBypass.delete(el); }, 60);
      }
    }
    fixAll.addEventListener('click', function () { doFix(false); });
    foot.appendChild(fixAll);
    if (isSend) {
      const fs = document.createElement('button'); fs.type = 'button'; fs.className = 'gd-primary'; fs.textContent = t('fixSend');
      fs.addEventListener('click', function () { doFix(true); });
      foot.appendChild(fs);
    }
    const cl = document.createElement('button'); cl.type = 'button'; cl.className = 'gd-secondary'; cl.textContent = t('close');
    cl.addEventListener('click', function () { dismissed.set(el, getText(el)); closePanel(); });
    foot.appendChild(cl);
    panel.appendChild(foot);
    document.body.appendChild(panel);
    const r = el.getBoundingClientRect();
    const panelWidth = Math.min(panel.offsetWidth || 360, window.innerWidth - 16);
    const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, r.left));
    const above = r.top - panel.offsetHeight - 10;
    panel.style.left = left + 'px';
    panel.style.top = Math.max(8, Math.min(window.innerHeight - Math.min(panel.offsetHeight, window.innerHeight - 16) - 8, above >= 8 ? above : r.bottom + 10)) + 'px';
    panel.focus();
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; } }
  function applyOne(idx, value) {
    if (!currentEl || !currentAnalysis) return;
    const issue = currentAnalysis.issues[idx];
    if (!issue) return;
    const text = getText(currentEl);
    const next = text.slice(0, issue.start) + value + text.slice(issue.end);
    setText(currentEl, next);
    // Re-analyse after a single fix so offsets stay honest, and rebuild
    // the panel from the fresh analysis instead of reusing stale offsets.
    closePanel();
    setTimeout(function () {
      if (!currentEl) return;
      const fresh = window.GDDecoder.analyze(getText(currentEl), settings);
      currentAnalysis = fresh;
      if (fresh.hasIssues) showFloat(currentEl, fresh); else hideFloat();
    }, 80);
  }

  let debounce = null;
  function analyseAndShow(el, fromInput) {
    if (!settings.enabled) { removeUI(); return; }
    const text = getText(el);
    if (!text || text.trim().length < 2) { hideFloat(); closePanel(); return; }
    const analysis = window.GDDecoder.analyze(text, settings);
    if (!analysis.hasIssues) { hideFloat(); return; }
    if (fromInput) showFloat(el, analysis);
    else { currentAnalysis = analysis; }
  }

  function attach(el) {
    if (el.dataset.gdAttached) return;
    el.dataset.gdAttached = '1';
    el.addEventListener('input', function () {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(function () { analyseAndShow(el, true); }, 350);
    });
    el.addEventListener('focus', function () { analyseAndShow(el, true); });
    el.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== el) hideFloat(); }, 300); });
  }
  function scan(root) {
    const els = (root || document).querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
    els.forEach(function (el) { if (isChatComposer(el)) attach(el); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const el = e.target && e.target.closest ? e.target.closest('textarea, [contenteditable]') : null;
    if (!el || !isChatComposer(el) || !settings.enabled || !settings.warnBeforeSend) return;
    if (sendBypass.get(el)) return;
    const text = getText(el);
    if (!text || text.trim().length < 2) return;
    if (dismissed.get(el) === text) return; // user already chose "keep as is"
    const analysis = window.GDDecoder.analyze(text, settings);
    // Block the send only for confident wrong-layout fixes (dictionary
    // hit). Ambiguous and "likely" matches never stop a message from being sent.
    const blocking = analysis.issues.filter(function (it) {
      return (it.type === 'layout-fa' || it.type === 'layout-en') && it.confidence === 'dict';
    });
    if (!blocking.length) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    showPanel(el, analysis, true);
  }, true);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel) { e.preventDefault(); closePanel(); if (currentEl && currentEl.isConnected) currentEl.focus(); } }, true);

  document.addEventListener('focusin', function (e) { const el = e.target; if (isChatComposer(el)) { attach(el); analyseAndShow(el, true); } });
  window.addEventListener('scroll', function () { if (currentEl && floatBtn && floatBtn.style.display !== 'none') positionFloat(currentEl); }, true);
  window.addEventListener('resize', function () { if (currentEl && floatBtn && floatBtn.style.display !== 'none') positionFloat(currentEl); });

  loadSettings(function () {
    scan(document);
    try {
      const obs = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && (n.matches('textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'))) { if (isChatComposer(n)) attach(n); }
            if (n.querySelectorAll) scan(n);
          });
        });
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {}
  });
})();
