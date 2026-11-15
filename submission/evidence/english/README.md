# English-default verification evidence

These files record software checks with explicitly synthetic demonstration inputs. They do not document an actual rover campaign or field validation.

- `local-ar6-live-export.json`: downloaded from the English local UI after a real Anthropic draft, explicit confirmation, AR6 evaluation and explanation with geology. Wrapper v2 embeds mission export 1.1.0; four requirements and three geological references. Codex validated and reconstructed it against the trusted repository snapshot and geological package.
- `local-spanish-brief-english-draft.json`: actual local API response to a synthetic Spanish brief. The generated activity, labels and questions are English; quotes remain exact fragments of the original Spanish input and requirements are unconfirmed.

Official source wording, identifiers and original input text are intentionally retained inside evidence JSON. This directory is separate from the ten historical exports in the parent directory; those older records have not been rewritten. See `docs/CODEX_ENGLISH_REVIEW.md` for scope, checks and release status.
