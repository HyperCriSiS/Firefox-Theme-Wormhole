# Agent notes

- Language for code, comments, UI texts, commits and docs: American English.
- No build step and no runtime dependencies. The repository root is the add-on.
- Never change the add-on ID in `manifest.json`: Firefox ties stored settings to it.

## README style

- Centered icon on top, title, bold tagline, one badge row (at most six).
- Every `##` heading starts with an emoji. Fixed ones: ✨ Features,
  📦 Installation, 🚀 Usage, ⚙️ Configuration, 🖼️ Screenshots,
  🩺 Troubleshooting, 💬 Support, 🙏 Credits, 📄 License. Other sections get
  a fitting emoji of their own, never one twice per file.
- Install path first, features as bullets, configuration as a table, one
  screenshot when there is a UI, GitHub alerts for warnings.

## Verified for real

A change counts as checked only when:

1. `npx web-ext lint --ignore-files "optional-chrome/**" ".github/**"` reports no errors.
2. The add-on was loaded in Firefox or Waterfox through `about:debugging` and
   the touched surface was looked at: header, new tab page with the bookmarks
   toolbar on and off, settings page.

## Branches and releases

- Default branch: `main`. Pull requests are squash merged.
- A change to the README alone is pushed straight to `main`, without a pull request.
- A release bumps `version` in `manifest.json`, builds the file with
  `npx web-ext build --ignore-files "optional-chrome/**" ".github/**" "images/*preview*"`
  and attaches it to a GitHub release tagged `v<version>`, together with a zip
  of `optional-chrome/chrome`. Ask before publishing a release.
