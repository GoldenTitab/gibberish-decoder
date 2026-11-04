# Regression tests — Gibberish Decoder 1.0.8

The Node test suite (`node tests/test_decoder.js`) covers:

- Persian ↔ English keyboard-layout conversion, including mixed-language text.
- Ambiguous words remaining untouched until the user chooses.
- Persian half-space restoration for `می` / `نمی` prefixes and `ها` / `های` / `هایی` / `تر` / `ترین` / `ی` suffix patterns.
- Half-space and number settings toggles.
- Persian, Arabic-Indic, and English digit normalization in supported conversion contexts.
- No Persian or English spelling correction or spelling suggestions.

These are logic tests under Node.js, not a claim of end-to-end testing in every website or browser editor.
