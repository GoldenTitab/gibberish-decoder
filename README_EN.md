# Gibberish Decoder (Gibberish Decoder) — Install and Use (English)

A desktop Chrome extension for multiline chat boxes, on all sites.
Typed on the wrong keyboard layout? For example you meant Persian but the
keyboard was on English and you got `sghl`, or you meant English but the
keyboard was on Persian and you got `اثممخ`? This extension maps the text
back by physical key to the correct language. It does not translate and
does not change meaning; it only fixes the keyboard layout.

## Your layout — checked on your own PC

Checked on 2026-11-03 from your PC (ALISHAH) over SSH:

- en-US: `00000409`
- fa (Persian, Iran): `00000429`
- de-DE: `00000407`

Layout 0429 is the basis for the map, from Windows KBDFA.DLL. The German
layout is not supported in this version, only the Persian ↔ English pair.

Physical-key map (key → Persian):
`q ض, w ص, e ث, r ق, t ف, y غ, u ع, i ه, o خ, p ح, [ ج, ] چ, \ پ,
a ش, s س, d ی, f ب, g ل, h ا, j ت, k ن, l م, ; ک, ' گ,
z ظ, x ط, c ز, v ر, b ذ, n د, m ئ, , و`
With Shift: `H آ, C ژ, V ؤ, / ؟, T ،, Y ؛, K «, L »`

## Install (Chrome desktop, Developer mode)

1. Unzip `gibberish-decoder.zip` into an empty folder.
   Important: do not delete or move that folder afterwards, Chrome reads
   the extension from there.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on `Developer mode` at the top right.
4. Click `Load unpacked` and pick the folder you unzipped.
5. The icon (white A and yellow ف on a dark indigo square) should appear
   in the toolbar. If not, click the Extensions puzzle icon and pin it.

To update: overwrite the same folder with the new version, then click
Refresh on the extension in `chrome://extensions`.

## Use

1. Open a multiline chat box on any site (ChatGPT, Gemini, Claude,
   DeepSeek, and any other site with a multiline box).
2. Type the gibberish text. After a short pause, a floating button
   «تبدیل متن (n)» / "Fix text (n)" appears above the box.
3. Click it. The suggestion panel opens:
   - Each row shows a keyboard-layout conversion or a half-space correction.
   - "Apply" fixes only that row.
   - "Fix all" applies only confident keyboard-layout, half-space (ZWNJ),
     and contextual number normalization.
   - No Persian or English spelling correction or spelling suggestions
     are included. Unknown words are left untouched.
4. Sending: if "warn before send" is on and you press Enter (without
   Shift) while confident wrong-layout text is present, the send is
   stopped and the panel opens. Click "Fix and send" to fix first, then
   send. Ambiguous items never block a send, and
   "Close" / "Keep as is" lets that exact text through on the next Enter.
   Honest note: every site's Send button is different; Enter interception
   is the main path. If you send by clicking the site's Send button, the
   panel will not open — click the floating "Fix text" button first,
   then send.

## Settings

Click the extension icon (popup) or, in `chrome://extensions`, click
`Details` then `Extension options`. All of these can be toggled:

- Enabled
- Floating button next to the chat box
- Block gibberish on Enter before sending
- Convert numbers too (۱۲۳ ↔ 123) — only together with a converted
  segment, not on their own
- Fix half-space (ZWNJ): می روم → می‌روم, کتاب ها → کتاب‌ها
- Only multiline chat boxes — if off, all multiline editable boxes are
  included, but password and search fields are still excluded
- UI language: Persian / English

Test box in the popup/options: paste gibberish there without going to a
site, and click "Auto convert" or "Convert all to Persian/English".
"Convert all" is a raw whole-text layout map, useful for testing the
map, not for mixed text.

## Privacy — fully offline

- No text is sent to any server. The code has no fetch, no analytics,
  no remote service.
- Settings are stored only with `chrome.storage.local` on this device,
  not Google sync.
- The extension attaches only to multiline chat boxes; password, search
  and single-line inputs are ignored.

## Honest limitations

- The dictionaries are small and offline (about 1,000 English and 450
  Persian frequent words). Rare words, names and technical terms that are not listed may
  appear as "likely" and are not applied by "Fix all"; click that row
  to apply it.
- Half-space is fixed only for standard patterns: می/نمی prefixes and
  ها/های/هایی/تر/ترین/ی suffixes. Joined possessives like «کتابم» are
  deliberately not in that list, because they are written without ZWNJ.
- A few characters are inherently ambiguous, for example `,` which is
  both the English comma key and Shift+U in Persian. Those are never
  guessed automatically.
- A word that makes sense in both languages is never converted
  automatically; you pick.
- In contenteditable boxes (like ChatGPT), the cursor may jump to the
  end after a fix. The text itself is not scrambled, but if the cursor
  was in the middle you will need to reposition it. In a textarea the
  cursor goes to the end of the fixed text.
- If a site keeps its chat box inside an unusual iframe or Shadow DOM,
  the button may not appear. In that case convert the text in the
  popup test box and paste it.

## Tests run

Node tests on the conversion logic (not in a browser) passed for:

- `sghl` → `سلام`
- `sghl ]di` → `سلام چیه`
- `ld o,hil` → `می‌خواهم` (with ZWNJ)
- `;jhf ih` → `کتاب‌ها`
- `sghl 123?` → `سلام ۱۲۳؟`
- `اثممخ` → `hello`
- `sghl I am fine` → `سلام I am fine` (only the gibberish part)
- `hello, how are you?` → unchanged
- `سلام خوبی؟` → unchanged
- `می روم` → `می‌روم`
- `کتاب ها` → `کتاب‌ها`


Live testing in a browser on chat sites has not been done yet — after
installing, try one gibberish test message in ChatGPT or Gemini and tell
me the result, so if a specific site behaves differently I can fix that
site's case.
