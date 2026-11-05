/* Gibberish Decoder — core logic, 100% local.
   Layout: Windows Persian (Iran) 00000429, KBDFA.DLL, verified against
   kbdlayout.info/KBDFA/shiftstates. Ali's PC (checked 2026-11-03 via SSH)
   has: en-US 00000409, fa 00000429, de-DE 00000407. This extension
   covers the fa <-> en pair only; German layout is out of scope.
   Mapping is by PHYSICAL key, not by sound. Example: pressing the key
   labelled S while intending Persian gives س, so Latin "sghl" is
   Persian "سلام" typed on the wrong layout, and Persian "اثممخ" is
   English "hello" typed on the wrong layout.
   Ambiguity is real for a few characters (notably "," which is both
   the English comma key and Shift+U in Persian). The analyser never
   silently guesses those: it returns an "ambiguous" issue with both
   options and leaves the text unchanged until the user picks one.
   Tokenisation is by whitespace chunk, not by letter run, because in
   the wrong layout several Persian letters ARE punctuation keys in
   English (چ is ], ج is [, پ is \, گ is ', ک is ;, و is ,). Splitting
   on those would shred words like "]di" (چیه) and "o,fd" (خوبی). */
(function (root) {
  const EN_TO_FA = {
    '`': '÷', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '0': '0', '-': '-', '=': '=',
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'چ', '\\': 'پ',
    'a': 'ش', 's': 'س', 'd': 'ی', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ک', "'": 'گ',
    'z': 'ظ', 'x': 'ط', 'c': 'ز', 'v': 'ر', 'b': 'ذ', 'n': 'د', 'm': 'ئ', ',': 'و', '.': '.', '/': '/',
    '~': '×', '!': '!', '@': '@', '#': '#', '$': '$', '%': '%', '^': '^', '&': '&', '*': '*', '(': ')', ')': '(', '_': '_', '+': '+',
    'Q': 'ً', 'W': 'ٌ', 'E': 'ٍ', 'R': '﷼', 'T': '،', 'Y': '؛', 'U': ',', 'I': ']', 'O': '[', 'P': '\\', '{': '}', '}': '{', '|': '|',
    'A': 'َ', 'S': 'ُ', 'D': 'ِ', 'F': 'ّ', 'G': 'ۀ', 'H': 'آ', 'J': 'ـ', 'K': '«', 'L': '»',
    'Z': 'ة', 'X': 'ی', 'C': 'ژ', 'V': 'ؤ', 'B': 'إ', 'N': 'أ', 'M': 'ء',
    ':': ':', '"': '"', '<': '<', '>': '>', '?': '؟', ' ': ' '
  };
  const FA_TO_EN = {};
  Object.keys(EN_TO_FA).forEach(function (en) {
    const fa = EN_TO_FA[en];
    if (fa === ',') return; // ambiguous "," — handled by the analyser, not this table
    if (!(fa in FA_TO_EN)) FA_TO_EN[fa] = en;
  });
  FA_TO_EN['ك'] = ';'; FA_TO_EN['ي'] = 'd'; FA_TO_EN['ى'] = 'd';
  FA_TO_EN['۰'] = '0'; FA_TO_EN['۱'] = '1'; FA_TO_EN['۲'] = '2'; FA_TO_EN['۳'] = '3'; FA_TO_EN['۴'] = '4';
  FA_TO_EN['۵'] = '5'; FA_TO_EN['۶'] = '6'; FA_TO_EN['۷'] = '7'; FA_TO_EN['۸'] = '8'; FA_TO_EN['۹'] = '9';
  FA_TO_EN['٠'] = '0'; FA_TO_EN['١'] = '1'; FA_TO_EN['٢'] = '2'; FA_TO_EN['٣'] = '3'; FA_TO_EN['٤'] = '4';
  FA_TO_EN['٥'] = '5'; FA_TO_EN['٦'] = '6'; FA_TO_EN['٧'] = '7'; FA_TO_EN['٨'] = '8'; FA_TO_EN['٩'] = '9';

  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const FA_LETTERS_RE = /[\u0621-\u064A\u066E-\u06D3]/;
  const FA_LETTERS_ONLY = /^[\u0621-\u064A\u066E-\u06D3]+$/;

  function normalizeFa(s) {
    return s.replace(/ك/g, 'ک').replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/[\u064B-\u0652]/g, '');
  }
  function faLookupKey(s) { return normalizeFa(s).replace(/[\u200C\u200D]/g, ''); }
  function getDicts() { return root.GD_DICTS || { EN_WORDS: [], FA_WORDS: [] }; }
  let SETS = null;
  function sets() {
    if (SETS) return SETS;
    const d = getDicts();
    const en = new Set(d.EN_WORDS.map(function (w) { return w.toLowerCase(); }));
    const fa = new Set(d.FA_WORDS.map(function (w) { return faLookupKey(w); }));
    SETS = { en: en, fa: fa, enList: Array.from(en), faList: Array.from(new Set(d.FA_WORDS)) };
    return SETS;
  }
  function mapChars(text, table) { let out = ''; for (const ch of text) out += (ch in table) ? table[ch] : ch; return out; }
  function digitsToFa(text) { return text.replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; }); }
  function digitsToEn(text) { return text.replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); }).replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }); }

  const ZWNJ_PREFIXES = ['می', 'نمی'];
  const ZWNJ_SUFFIXES = ['ها', 'های', 'هایی', 'تر', 'ترین', 'ی'];
  // Find "word<space>word" pairs that need a half-space. Words are
  // scanned one by one (not with a consuming regex), otherwise in
  // "من می روم" the pair "من می" would swallow "می" and "می روم"
  // would never be seen.
  function zwnjPairs(text) {
    const re = /[\u0621-\u064A\u066E-\u06D3]+/g;
    const words = []; let m;
    while ((m = re.exec(text)) !== null) words.push({ w: m[0], start: m.index, end: m.index + m[0].length });
    const out = []; let lastEnd = -1;
    for (let i = 0; i + 1 < words.length; i++) {
      const A = words[i], B = words[i + 1];
      if (text.slice(A.end, B.start) !== ' ' || A.start < lastEnd) continue;
      if ((ZWNJ_PREFIXES.indexOf(A.w) !== -1 && B.w.length >= 2) || (ZWNJ_SUFFIXES.indexOf(B.w) !== -1 && A.w.length >= 2)) {
        out.push({ start: A.start, end: B.end, a: A.w, b: B.w });
        lastEnd = B.end;
      }
    }
    return out;
  }
  function fixZwnj(text) {
    const pairs = zwnjPairs(text);
    for (let i = pairs.length - 1; i >= 0; i--) {
      const p = pairs[i];
      text = text.slice(0, p.start) + p.a + '\u200C' + p.b + text.slice(p.end);
    }
    return text;
  }
  function convertEnToFa(text, opts) {
    opts = opts || {};
    let out = normalizeFa(mapChars(text, EN_TO_FA));
    if (opts.fixNumbers !== false) out = digitsToFa(out);
    if (opts.fixZwnj !== false) out = fixZwnj(out);
    return out;
  }
  function convertFaToEn(text, opts) {
    opts = opts || {};
    let out = mapChars(text, FA_TO_EN);
    if (opts.fixNumbers !== false) out = digitsToEn(out);
    return out;
  }

  function hasVowel(s) { return /[aeiou]/i.test(s); }
  // A decoded Persian word is only "likely English" when it could be
  // pronounced: has a vowel and no run of 3+ consonants ("isjl" is not).
  function pronounceable(s) { return hasVowel(s) && !/[^aeiou]{3,}/i.test(s); }
  // Vowel-less tech terms that are real English, never gibberish.
  const TECH_TERMS = ['html', 'http', 'https', 'pnpm', 'grpc', 'mvvm', 'cdnjs', 'ssh', 'sudo', 'rdbms'];
  function isLatinChunk(t) { return /[A-Za-z]/.test(t); }
  function isFaChunk(t) { return FA_LETTERS_RE.test(t); }

  // Strip only true sentence punctuation from the ends for a dict check.
  // Do NOT strip [ ] \ ; ' , here: in the wrong layout those ARE letters.
  function stripSentencePunct(t) {
    return t.replace(/^[«»"“”'(\s]+/, '').replace(/[\s?!.,;:؟،؛»"”')]+$/, '');
  }

  function analyze(text, settings) {
    settings = Object.assign({ fixNumbers: true, fixZwnj: true }, settings || {});
    const s = sets();
    const issues = [];
    // ---- Step 1: ZWNJ first, so "می روم" is fixed as a pair and its
    // parts are handled as a single half-space correction.
    const zwnjIssues = [];
    if (settings.fixZwnj) {
      zwnjPairs(text).forEach(function (p) {
        const joined = p.a + '\u200C' + p.b;
        zwnjIssues.push({ start: p.start, end: p.end, original: text.slice(p.start, p.end), corrected: joined, type: 'zwnj', alternatives: [joined], confidence: 'rule' });
      });
    }
    function overlapsZwnj(start, end) { return zwnjIssues.some(function (it) { return it.start < end && start < it.end; }); }
    issues.push.apply(issues, zwnjIssues);

    // ---- Step 2: whitespace chunks.
    const chunkRe = /\S+/g; let cm;
    const chunks = [];
    while ((cm = chunkRe.exec(text)) !== null) chunks.push({ text: cm[0], start: cm.index, end: cm.index + cm[0].length });
    // Helper to decide a chunk's direction for digit/punct neighbours.
    const chunkDirs = []; // 'fa' | 'en' | null, filled as we go
    chunks.forEach(function (chunk, ci) {
      const t = chunk.text;
      if (overlapsZwnj(chunk.start, chunk.end)) { chunkDirs[ci] = 'fa'; return; }
      const core = stripSentencePunct(t);
      if (!core || core.length < 2) { chunkDirs[ci] = null; return; }
      const latin = isLatinChunk(core) && !isFaChunk(core);
      const fa = isFaChunk(core) && !isLatinChunk(core);
      if (!latin && !fa) { chunkDirs[ci] = null; return; } // digits/punct only, handled in step 3
      if (latin) {
        // Whole-chunk first (so "]di" -> "چیه", "o,fd" -> "خوبی"),
        // then stripped core (so "sghl," -> "سلام" + ",").
        const candidates = [];
        candidates.push({ str: t, start: chunk.start, end: chunk.end });
        if (core !== t) candidates.push({ str: core, start: chunk.start + (t.indexOf(core)), end: chunk.start + (t.indexOf(core)) + core.length });
        let handled = false;
        // Pass 1: dict / ambiguous for every candidate first, so a
        // dict-valid core ("sghl" in "sghl,") wins over a merely
        // "likely" whole chunk ("سلامو" from "sghl,").
        for (const cand of candidates) {
          const str = cand.str;
          const lower = str.toLowerCase();
          if (!/^[A-Za-z\[\]\\;',.]+$/.test(str)) continue;
          const origValid = s.en.has(lower);
          const decodedWhole = convertEnToFa(str, { fixNumbers: false, fixZwnj: false });
          const decodedCore = stripSentencePunct(decodedWhole);
          const decodedValid = s.fa.has(faLookupKey(decodedCore)) && FA_LETTERS_RE.test(decodedCore);
          if (origValid && decodedValid) {
            issues.push({ start: cand.start, end: cand.end, original: str, corrected: str, type: 'ambiguous', alternatives: [str, decodedCore], confidence: 'both-valid' });
            chunkDirs[ci] = null; handled = true; break;
          }
          if (!origValid && decodedValid) {
            let corr = convertEnToFa(str, settings);
            issues.push({ start: cand.start, end: cand.end, original: str, corrected: corr, type: 'layout-fa', alternatives: [corr], confidence: 'dict' });
            chunkDirs[ci] = 'fa'; handled = true; break;
          }
        }
        if (handled) return;
        // Pass 2: "likely" whole/core, only if no dict hit above.
        for (const cand of candidates) {
          const str = cand.str;
          const lower = str.toLowerCase();
          if (!/^[A-Za-z\[\]\\;',.]+$/.test(str)) continue;
          if (s.en.has(lower)) continue;
          const decodedWhole = convertEnToFa(str, { fixNumbers: false, fixZwnj: false });
          const decodedCore = stripSentencePunct(decodedWhole);
          if (FA_LETTERS_ONLY.test(decodedCore) && decodedCore.length >= 4 && !hasVowel(lower) && TECH_TERMS.indexOf(lower.replace(/[^a-z]/g, '')) === -1) {
            let corr = convertEnToFa(str, settings);
            issues.push({ start: cand.start, end: cand.end, original: str, corrected: corr, type: 'layout-fa', alternatives: [corr], confidence: 'likely' });
            chunkDirs[ci] = 'fa'; handled = true; break;
          }
        }
        if (handled) return;
        // Valid English; unknown words are left untouched.
        if (s.en.has(core.toLowerCase())) { chunkDirs[ci] = 'en'; return; }
        chunkDirs[ci] = null; return;
      }
      // Persian chunk
      if (core.indexOf('‌') !== -1) { chunkDirs[ci] = 'fa'; return; }
      if (s.fa.has(faLookupKey(core))) { chunkDirs[ci] = 'fa'; return; }
      const decoded = convertFaToEn(core, { fixNumbers: false });
      const decodedLower = decoded.toLowerCase();
      const decodedValid = s.en.has(decodedLower) && /[A-Za-z]/.test(decoded);
      if (decodedValid) {
        const start = chunk.start + t.indexOf(core);
        issues.push({ start: start, end: start + core.length, original: core, corrected: convertFaToEn(core, settings), type: 'layout-en', alternatives: [convertFaToEn(core, settings)], confidence: 'dict' });
        chunkDirs[ci] = 'en'; return;
      }
      if (/^[A-Za-z]+$/.test(decoded) && decoded.length >= 4 && pronounceable(decoded)) {
        const start = chunk.start + t.indexOf(core);
        const corr = convertFaToEn(core, settings);
        issues.push({ start: start, end: start + core.length, original: core, corrected: corr, type: 'layout-en', alternatives: [corr], confidence: 'likely' });
        chunkDirs[ci] = 'en'; return;
      }
      chunkDirs[ci] = null;
    });

    // ---- Step 2b: an "ambiguous" word (e.g. "and" is also شدی) sitting
    // among valid English words is just English; do not bother the user.
    for (let k = issues.length - 1; k >= 0; k--) {
      const it = issues[k];
      if (it.type !== 'ambiguous') continue;
      let ci = -1;
      chunks.forEach(function (c, i) { if (c.start <= it.start && it.start < c.end) ci = i; });
      let prev = null, next = null;
      for (let i = ci - 1; i >= 0; i--) { if (chunkDirs[i]) { prev = chunkDirs[i]; break; } }
      for (let i = ci + 1; i < chunks.length; i++) { if (chunkDirs[i]) { next = chunkDirs[i]; break; } }
      if ((prev === 'en' || next === 'en') && prev !== 'fa' && next !== 'fa') issues.splice(k, 1);
    }

    // ---- Step 2c: sentence-level context. The dictionaries are small, so
    // a wrong-layout Persian sentence always contains words the dictionary
    // has never seen (دکمه, شناور, کروم ...). Judging every word on its own
    // leaves those behind, and "likely" words were listed but never applied.
    // When most of the text is clearly wrong-layout Persian, finish the
    // job: promote "likely" hits, convert a lone "," (= و), and convert
    // the remaining unknown Latin-key chunks, except ones that look like
    // real English (pronounceable letters only), a domain/file name, or a
    // tech term. Only runs for the Persian direction: an unknown Persian
    // chunk cannot be told apart from a correct Persian word.
    if (settings.contextFix !== false) {
      let wrongFa = 0, rightEn = 0, rightFa = 0;
      issues.forEach(function (it) { if (it.type === 'layout-fa' && it.confidence === 'dict') wrongFa++; });
      chunks.forEach(function (c, i) {
        const hasIssue = issues.some(function (it) { return it.type !== 'ambiguous' && it.start < c.end && c.start < it.end; });
        if (chunkDirs[i] === 'en') rightEn++;
        else if (chunkDirs[i] === 'fa' && !hasIssue) rightFa++;
      });
      if (wrongFa >= 1 && wrongFa > rightEn + rightFa) {
        issues.forEach(function (it) { if (it.type === 'layout-fa' && it.confidence === 'likely') it.confidence = 'context'; });
        chunks.forEach(function (chunk, ci) {
          if (chunkDirs[ci]) return;
          if (issues.some(function (it) { return it.start < chunk.end && chunk.start < it.end; })) return;
          const t = chunk.text;
          if (t === ',') {
            issues.push({ start: chunk.start, end: chunk.end, original: t, corrected: 'و', type: 'layout-fa', alternatives: ['و'], confidence: 'context' });
            chunkDirs[ci] = 'fa'; return;
          }
          const body = t.replace(/[?!:]+$/, '');
          if (body.length < 2 || !/^[A-Za-z\[\]\\;',.]+$/.test(body) || !/[A-Za-z\[\]\\;',]/.test(body)) return;
          if (/[A-Za-z]\.[A-Za-z]/.test(body)) return; // github.com, file.txt
          if (/^[A-Za-z]{3,}$/.test(body) && pronounceable(body)) {
            // Reads like real English, so never convert it silently. But do
            // not drop it silently either: offer both readings in the panel
            // (e.g. "fhai" = باشه). Skipped when the decoded form would need
            // Shift-only marks, which means it was clearly real English.
            const alt = convertEnToFa(body, { fixNumbers: false, fixZwnj: false });
            if (FA_LETTERS_ONLY.test(alt) && !/[\u064B-\u0652\u0629\u0624\u0625\u0623\u0621\u0640]/.test(alt)) {
              issues.push({ start: chunk.start, end: chunk.start + body.length, original: body, corrected: body, type: 'ambiguous', alternatives: [body, alt], confidence: 'both-valid' });
            }
            return;
          }
          if (TECH_TERMS.indexOf(body.toLowerCase()) !== -1) return;
          const corr = convertEnToFa(body, settings);
          if (!FA_LETTERS_RE.test(corr)) return;
          issues.push({ start: chunk.start, end: chunk.start + body.length, original: body, corrected: corr, type: 'layout-fa', alternatives: [corr], confidence: 'context' });
          chunkDirs[ci] = 'fa';
        });
      }
    }

    // ---- Step 3: digits and ? / ؟ next to a known-direction segment.
    // Only these two are converted on their own: "?" is Shift+/ in both
    // layouts (so ? <-> ؟ is a physical mapping), and digits were
    // explicitly requested. Other punctuation is left alone unless it
    // was part of a layout token in step 2.
    if (settings.fixNumbers) {
      chunks.forEach(function (chunk, ci) {
        const t = chunk.text;
        if (!/^[0-9۰-۹٠-٩?؟]+$/.test(t)) return;
        if (overlapsZwnj(chunk.start, chunk.end)) return;
        // Direction from nearest non-null neighbour, preferring previous.
        let dir = null;
        for (let i = ci - 1; i >= 0; i--) { if (chunkDirs[i]) { dir = chunkDirs[i]; break; } }
        if (!dir) for (let i = ci + 1; i < chunks.length; i++) { if (chunkDirs[i]) { dir = chunkDirs[i]; break; } }
        if (!dir) return;
        let corr = t;
        if (dir === 'fa') corr = digitsToFa(t).replace(/\?/g, '؟');
        else corr = digitsToEn(t).replace(/؟/g, '?');
        if (corr !== t) issues.push({ start: chunk.start, end: chunk.end, original: t, corrected: corr, type: dir === 'fa' ? 'layout-fa' : 'layout-en', alternatives: [corr], confidence: 'neighbour' });
      });
    }

    issues.sort(function (x, y) { return x.start - y.start; });
    let correctedText = text;
    // Apply only confident keyboard-layout/ZWNJ/number corrections.
    const apply = issues.filter(function (it) {
      return it.type !== 'ambiguous' && it.confidence !== 'likely';
    });
    for (let i = apply.length - 1; i >= 0; i--) {
      const it = apply[i];
      correctedText = correctedText.slice(0, it.start) + it.corrected + correctedText.slice(it.end);
    }
    // ZWNJ restoration after layout conversion: a Persian word typed on
    // the English layout loses its half-space (Shift+Space becomes a
    // plain space), so "ld o,hil" -> "می خواهم" must then become
    // "می‌خواهم", and ";jhf ih" -> "کتاب ها" must become "کتاب‌ها".
    // The panel's Fix-all uses correctedText (see content.js), so it
    // gets this fix too.
    if (settings.fixZwnj) correctedText = fixZwnj(correctedText);
    return { issues: issues, correctedText: correctedText, hasIssues: issues.length > 0 };
  }
  // ---- Whole-text conversion, same engine as the popup's quick test.
  // The only extra step is choosing the direction automatically:
  //  1) dictionary evidence from analyze() (wrong-layout fa vs en hits);
  //  2) with no evidence at all, a "gibberish" test on the Latin-key
  //     chunks (inner ; , [ ] ' keys or unpronounceable letter runs).
  // Returns 'fa', 'en' or null (null = no clear direction, do not force).
  function detectDirection(text, settings, analysis) {
    settings = settings || {};
    analysis = analysis || analyze(text, settings);
    let toFa = 0, toEn = 0;
    analysis.issues.forEach(function (it) {
      if (it.type === 'layout-fa' && it.confidence !== 'neighbour') toFa++;
      else if (it.type === 'layout-en' && it.confidence !== 'neighbour') toEn++;
    });
    if (toFa > toEn) return 'fa';
    if (toEn > toFa) return 'en';
    const st = sets();
    const chunks = text.split(/\s+/).filter(function (c) { return c.length >= 2; });
    const latin = chunks.filter(function (c) { return /^[A-Za-z\[\]\\;',.?!:]+$/.test(c) && /[A-Za-z\[\]\\;',]/.test(c); });
    if (!latin.length || latin.length !== chunks.length) return null;
    let valid = 0, gib = 0;
    latin.forEach(function (c) {
      const body = c.replace(/[?!:.]+$/, '');
      if (st.en.has(body.toLowerCase())) { valid++; return; }
      if (TECH_TERMS.indexOf(body.toLowerCase()) !== -1 || /[A-Za-z]\.[A-Za-z]/.test(body)) return;
      if (/[A-Za-z][;,'\[\]\\][A-Za-z]/.test(body) || /^[\[\];',\\]/.test(body) || !pronounceable(body)) gib++;
    });
    return (gib >= 1 && gib * 2 >= latin.length && valid * 2 < latin.length) ? 'fa' : null;
  }
  function convertAuto(text, settings) {
    settings = Object.assign({ fixNumbers: true, fixZwnj: true }, settings || {});
    const analysis = analyze(text, settings);
    const dir = detectDirection(text, settings, analysis);
    if (dir === 'fa') return { direction: 'fa', text: convertEnToFa(text, settings) };
    if (dir === 'en') return { direction: 'en', text: convertFaToEn(text, settings) };
    return { direction: null, text: analysis.correctedText };
  }
  function applyIssues(text, issues) {
    let out = text;
    const sorted = issues.slice().sort(function (a, b) { return b.start - a.start; });
    sorted.forEach(function (it) { out = out.slice(0, it.start) + it.corrected + out.slice(it.end); });
    return out;
  }
  function tokenize(text) {
    const re = /\S+/g; const out = []; let m;
    while ((m = re.exec(text)) !== null) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }
  root.GDDecoder = {
    EN_TO_FA: EN_TO_FA, FA_TO_EN: FA_TO_EN,
    normalizeFa: normalizeFa, faLookupKey: faLookupKey,
    fixZwnj: fixZwnj, convertEnToFa: convertEnToFa, convertFaToEn: convertFaToEn,
    analyze: analyze, detectDirection: detectDirection, convertAuto: convertAuto,
    applyIssues: applyIssues, tokenize: tokenize
  };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.GDDecoder;
