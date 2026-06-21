# Line Arranger

A small browser tool for cutting up and rearranging found lines and words into a poem or lyric — inspired by the stream-of-consciousness, cut-up methods used by Bowie and OMD: write down lines as they come, then physically move them around until something sticks.

No build step, no dependencies, no server. Open it and start arranging.

## Usage

Open [`index.html`](index.html) in a browser, or serve the folder with any static file server.

- **Add lines** — paste a block of text into the Inbox box and click *Add All* (it splits on line breaks), or type a single line/word into the quick-add field and press Enter.
- **Arrange** — drag cards between the Inbox and the Page, and reorder within either list by dragging. Each card also has `→`/`←` buttons for moving without drag-and-drop (handy on mobile).
- **Edit** — double-click any card's text, in the Inbox or on the Page, to edit it in place. Enter saves, Esc cancels.
- **Delete** — the `✕` button on a card removes it.
- **Save your work** — everything autosaves to the browser's local storage as you go. Use *Export poem (.txt)* to download the Page as plain text, or *Save project (.json)* to save the full Inbox + Page state and reload it later with *Load project*.

## Notes

- Pasting from apps that copy rich text (e.g. Scrivener) is handled specially: if the clipboard includes an HTML flavor, block-level breaks (`<p>`, `<div>`, `<br>`, etc.) are converted into real line breaks before splitting, since some apps' plain-text clipboard flavor loses paragraph breaks.
- Line splitting handles `\n`, `\r`, and `\r\n` line endings.

## Tech

Plain HTML, CSS, and vanilla JavaScript ([app.js](app.js)). No frameworks, no build tooling, no external dependencies.
