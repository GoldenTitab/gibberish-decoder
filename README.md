# Gibberish Decoder

A Chrome extension that fixes text typed on the wrong keyboard layout in
multiline chat boxes, on all sites.

Typed Persian while the keyboard was on English and got `sghl`? Or typed
English while the keyboard was on Persian and got `اثممخ`? This extension
maps the text back by physical key to the correct language. It does not
translate and does not change meaning; it only fixes the keyboard layout.

> راهنمای فارسی: [README_FA.md](README_FA.md)
> Detailed English guide: [README_EN.md](README_EN.md)

## What it does

- **Wrong-layout fix, per part, not whole text.** `sghl I am fine` becomes
  `سلام I am fine` — only the gibberish part is fixed.
- **Floating button.** After a short pause while typing in a chat box, a
  "Fix text" button appears above the box. Click it to open the
  suggestion panel.
- **Per-row fixes.** Each row shows original → corrected with a type label
  (wrong layout, half-space). "Apply" fixes only that row;
  "Fix all" applies all confident fixes at once.
- **Choice when both sides make sense.** If a word is valid in both
  languages, the panel shows every option and picks none automatically.
- **Enter guard.** With "warn before send" on, pressing Enter (without
  Shift) while confident wrong-layout text is present stops the send and
  opens the panel. Click "Fix and send" to fix first, then send. Ambiguous,
  half-space and digit-only items never block a send, and
  "Close" / "Keep as is" lets that exact text through on the next Enter.
- **Half-space (ZWNJ).** `می روم` → `می‌روم`, `کتاب ها` → `کتاب‌ها`.
- **Numbers and punctuation.** Converted together with a converted segment
  (`sghl 123?` → `سلام ۱۲۳؟`), never on their own.
- **Persian output uses Persian ک and ی.**
- **No spelling correction.** Unknown words are left untouched. Version
  1.0.8 deliberately removed spelling suggestions, so a typo like `wrold`
  or `helo` is never "corrected" into a wrong word.
- **Fully local.** No fetch, no analytics, no remote service. Settings are
  stored only with `chrome.storage.local` on this device.
- **Vazir font.** The popup, options page, floating button and panel all
  use the bundled Vazir font (Regular for body, Bold for headings),
  with no CDN download.

Supported layouts: Windows Persian (Iran) `00000429` ↔ English (US)
`00000409`, from the Windows KBDFA map. German layouts are not supported
in this version. Chrome desktop only.

## Install (Chrome desktop, Developer mode)

1. Clone this repo, or download it as a ZIP and unzip it into a folder.
   Important: do not delete or move that folder afterwards, Chrome reads
   the extension from there.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on `Developer mode` at the top right.
4. Click `Load unpacked` and pick the project folder.
5. The Gibberish Decoder icon (purple ف / A cubes with swap arrows)
   should appear in the toolbar. If not, click the Extensions puzzle
   icon and pin it.

To update: pull the new version into the same folder, then click Refresh
on the extension in `chrome://extensions`.

## Use

1. Open a multiline chat box on any site (ChatGPT, Gemini, Claude,
   DeepSeek, and any other site with a multiline box).
2. Type the gibberish text. After a short pause, the floating button
   appears above the box.
3. Click it, review the rows, and apply per row or fix all confident
   items. If you send by clicking the site's own Send button, the panel
   will not open — click the floating "Fix text" button first, then send.

Settings (extension icon, or Details → Extension options) include:
enabled, floating button, block gibberish on Enter, convert numbers,
fix half-space, only multiline
chat boxes, and UI language (Persian / English). The popup and options
pages also have a test box: paste gibberish there and convert it without
going to a site.

## Honest limitations

- The dictionaries are small and offline (about 1,000 English and 450
  Persian frequent words). Rare words, names and technical terms that are
  not listed may appear as "likely" and are not applied by "Fix all".
- Half-space is fixed only for standard patterns: می/نمی prefixes and
  ها/های/هایی/تر/ترین/ی suffixes. Joined possessives like «کتابم» are
  deliberately not fixed, because they are written without ZWNJ.
- A few characters are inherently ambiguous (for example `,`, which is
  both the English comma key and a Persian key). Those are never guessed
  automatically.
- In contenteditable boxes (like ChatGPT), the cursor may jump to the end
  after a fix. The text itself is not scrambled.
- If a site keeps its chat box inside an unusual iframe or Shadow DOM,
  the button may not appear. In that case convert the text in the popup
  test box and paste it.
- Live testing in a browser on chat sites has not been done yet — after
  installing, try one gibberish test message in ChatGPT or Gemini and
  report the result, so a site-specific case can be fixed.

## Tests

The conversion logic has a Node test suite (no browser needed):

```sh
node tests/test_decoder.js
```

It covers layout conversion in both directions, mixed text, ZWNJ pairs,
numbers, ambiguous words, and words that must stay
unchanged — including the explicit rule that spelling is never analysed.
See [TESTS.md](TESTS.md) for the full case list.

## Project structure

```text
manifest.json          Manifest V3, storage permission only
content.js / content.css   Floating button, panel, Enter guard
src/decoder.js         Layout map, ZWNJ, digit handling, analysis
src/dictionaries.js    Offline English / Persian word lists
popup.html / popup.js / popup.css   Toolbar popup + test box
options.html           Extension options page
fonts.css / fonts/     Bundled Vazir font (Thin/Light/Regular/Medium/Bold)
icons/                 Extension icons (16/32/48/128, plus master + logo source)
_locales/              Extension name/description (en/fa)
tests/test_decoder.js  Node regression tests
README_FA.md           Full Persian install/use guide
README_EN.md           Full English install/use guide
```

## Version

Current version: **1.0.8** — layout-only correction (spelling analysis
removed: unknown words stay untouched), expanded ZWNJ patterns
(می/نمی, ها/های/هایی), Persian/Arabic-Indic digit handling, redesigned
popup/options UI with accessibility labels, new icons, and the bundled
Vazir font.
