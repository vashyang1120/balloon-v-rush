# Adventure v0.4.12 entry reliability

Base: 5faa36c. Draft for PM review. The GitHub Pages workflow publishes both game folders from main. Keep this PR unmerged until approved.

## Isolated preview

Download the `adventure-entry-preview` artifact from this PR's Actions run and extract the inner ZIP. From the extracted root, run `node tests/preview-entry.cjs`. It starts a loopback server and prints URLs for both games. Open them with guest and sandbox flags as printed. The local server uses an origin separate from GitHub Pages and production player data.

| URL | Build |
|---|---|
| http://127.0.0.1:8412/rpg-continent1-universe/?guest=1&sandbox=1 | First-continent candidate |
| http://127.0.0.1:8412/rpg-dual-continent-test/?guest=1&sandbox=1 | Dual-continent candidate |

## What changed

- Wait for Chapter 1 assets before resetting the previous adventure during official restart. Retry previously failed required assets on re-entry and use source URLs for the current checkout.
- Audit found the old angry portrait primary path was absent in Git. The shipped file has a double extension. This was optional and does not independently explain the historical gate dialog.
- Only a verified hammer recipe unlocks whack. The existing 1-2 guaranteed recipe and cleared milestone enable the first round. Legacy saves use the recipe or permanent 1-2 completion and keep existing paid attempts.
- Images and audio report readiness to the shared Adventure Loading screen. Start debits once and persists the paid session. Aborted or failed loads do not reserve a round. A paid unfinished session can resume the same seed. Settlement still uses the current session's existing reward table.
- Add the two approved stories in the existing home panels.

## Rollback

Before merge, close this draft or revert the entry-reliability commit on the topic branch. If a subsequent approved release needs rollback, revert the release commit and verify the Pages run and both entry URLs. Existing paid-session and settlement records retain their original fields. The additional whack eligibility markers do not require deleting or restoring player storage.
