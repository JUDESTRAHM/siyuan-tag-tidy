# Tag Tidy: Duplicates & Cleanup

Find tags that are really the same tag, and merge them in one click. Free and open source (MIT), no telemetry, no network calls beyond your own SiYuan kernel.

## What it does
- Click the tags icon in the top bar (or run the command "Open Tag Tidy").
- Finds likely duplicate tags: `#Project#` and `#project#`, `#my-tag#` and `#my_tag#`, `#todo#` and `#todos#`. They are matched ignoring capitals, spaces, hyphens, underscores and a plural s, one path segment at a time (`work/Alpha` and `Work/alpha`).
- Suggests the most used spelling as the one to keep (shorter wins a tie) and merges with one click. Merging uses SiYuan's own tag rename, so every document that uses the tag is updated.
- Lists tags used only once (often typos) and your most used tags.
- Copies a Markdown report of everything above.

Tip: merging renames tags inside your documents, so try it on one group first. Parent tags: renaming a parent tag also renames its sub-tags.

## Free and Pro
Everything above is free forever. Pro is an optional one-time license ($12).

| | Free | Pro |
|---|---|---|
| Duplicate tag finder, one-click merge per group, single-use and top tags, Markdown report | yes | yes |
| Merge all suggestions at once (with a confirm step) | | yes |
| CSV export of every tag with its use count and suggested merge target | | yes |

To unlock Pro, open the plugin window, click "Get a license key", pay once, and paste the key into the License key box. The key is checked on your device (Ed25519 signature); nothing is sent anywhere and there is no account. No telemetry.

## Install
Marketplace, then Plugins, search "Tag Tidy".

## Develop
`npm install`, then `node build.mjs` bundles `src/plugin.js` into `index.js`. `npm test` runs the tests. `node test/realkernel.mjs` runs the plugin against a local kernel on port 6806.

More from this developer: [Document Stats & Reading Time](https://github.com/JUDESTRAHM/siyuan-doc-stats), [Link Health](https://github.com/JUDESTRAHM/siyuan-link-health), [Database Charts & Reports](https://github.com/JUDESTRAHM/siyuan-db-reports), [Habit Heatmap & Streaks](https://github.com/JUDESTRAHM/siyuan-habit-heatmap).
