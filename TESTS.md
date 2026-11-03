# Tests — Gibberish Decoder 1.0.4

Run with Node (logic only, no browser):

```
node tests/test_decoder.js
```

Core conversion regression cases pass in the included Node test suite, except where a note says the
behaviour is intentionally "show options, do not auto-apply".

| Input | Corrected (Fix-all) | Notes |
|---|---|---|
| `sghl` | `سلام` | layout-fa, dict |
| `sghl ]di` | `سلام چیه` | `]di` is چیه: ] is چ, d is ی, i is ه |
| `ld o,hil` | `می‌خواهم` | layout + ZWNJ post-process |
| `;jhf ih` | `کتاب‌ها` | layout + ZWNJ post-process |
| `sghl 123?` | `سلام ۱۲۳؟` | digits + ? converted with their segment |
| `اثممخ` | `hello` | layout-en, dict |
| `sghl I am fine` | `سلام I am fine` | only the gibberish part |
| `hello, how are you?` | unchanged | valid English |
| `سلام خوبی؟` | unchanged | valid Persian; earlier bug where ؟ was treated as a letter is fixed |
| `می روم` | `می‌روم` | ZWNJ rule, and روم is no longer flagged as a spelling error |
| `کتاب ها` | `کتاب‌ها` | ZWNJ rule |
| `wrold` | unchanged by Fix-all, suggestion `world` | Damerau: transposition = 1 edit; spelling is suggest-only |
| `helo` | unchanged by Fix-all, options help / hello / held | multi-candidate spelling: user picks |
| `سلان` | unchanged by Fix-all, options سلام / الان | multi-candidate spelling: user picks |
| `سلامم` | unchanged by Fix-all, suggestion `سلام` | spelling is never auto-applied (small dictionary) |
| `من می روم` | `من می‌روم` | 1.0.4: ZWNJ pair no longer swallowed by the previous word |
| `امروز هوا خوب است` | unchanged | 1.0.4: used to become `امروز‌ها خوب است` |
| `لطفا کمک کن` | unchanged | 1.0.4: used to become `لطفا نمک کن` |
| `this and that` | unchanged | 1.0.4: `and` is not flagged among English words |

Known non-bug: `ld o,hl` (missing ه) converts only `ld` → `می` and
leaves `o,hl` alone, because `خوام` is not a word. The correct input for
می‌خواهم is `ld o,hil`.

Not tested live: floating button, panel and Enter guard in Chrome on
ChatGPT / Gemini / Claude / DeepSeek. Those need a live browser pass
after install; the logic above is the part that was verified here.
