<p align="center"><img src="icons/icon-128.png" alt="Wormhole icon" width="128"></p>

# Wormhole

**A dark space theme for Firefox and Waterfox where the header looks like one seamless picture.**

[![CI](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/actions/workflows/ci.yml/badge.svg)](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/HyperCriSiS/Firefox-Theme-Wormhole?label=Release)](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/releases/latest)
[![License](https://img.shields.io/github/license/HyperCriSiS/Firefox-Theme-Wormhole)](LICENSE)

Most browser themes paint each toolbar on its own, so the artwork breaks at
every row. Wormhole keeps toolbars transparent, so one image runs across the
tab strip, navigation bar and bookmarks toolbar, and continues on the new tab
page below them. Toggling the bookmarks toolbar shows more or less of the same
image instead of stretching it. Web pages themselves stay untouched: a theme
cannot paint behind them.

> [!IMPORTANT]
> Requires Firefox or Waterfox 140 or later. The release file is not signed by
> Mozilla, so regular Firefox only accepts it as a temporary add-on; Waterfox
> and Firefox Developer Edition can install it permanently with
> `xpinstall.signatures.required` set to `false`.

## ✨ Features

- One continuous header image across all toolbars, with no separator lines.
- New tab page that continues the header image and follows toolbar height changes.
- Search on the new tab page uses your default search engine.
- Custom header and new tab images from the settings page.
- Optional: show the Wormhole page in new windows and for the Home button.
- Optional `userChrome.css` that also removes the last line between toolbars and page.

## 📦 Installation

1. Download `wormhole-<version>.xpi` from the [latest release](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/releases/latest).
2. Open `about:addons`, click the gear icon and choose **Install Add-on From File**.

For a quick test, open `about:debugging`, choose **This Firefox**, then
**Load Temporary Add-on** and pick `manifest.json` from a checkout.

## 🚀 Usage

Open a new tab. The header image continues below the toolbars and the search
field opens addresses directly or searches with your default engine.

![New tab page](images/newtab-preview.jpg)

## ⚙️ Configuration

Open `about:addons`, then **Wormhole** and **Settings**.

| Option | Default | Effect |
|---|---|---|
| Header image | Built-in wormhole | Image painted across all toolbars, anchored top right at its original size. About 3840 x 320 px works best. |
| New tab background | Built-in space scene | Background of the new tab page. |
| Continue the header image seamlessly | On | Continues the header image on the new tab page. Off shows a visible edge below the toolbars. |
| Show the Wormhole page in new windows | Off | Replaces the home page in new windows and for the Home button. |

## 🧵 Seamless toolbar edge (optional)

Firefox draws a thin line between the toolbars and the page that a theme
cannot remove. `optional-chrome/chrome/userChrome.css` removes it and styles
menus and panels to match.

1. Set `toolkit.legacyUserProfileCustomizations.stylesheets` to `true` in `about:config`.
2. Open `about:support` and click **Open Folder** next to **Profile Folder**.
3. Copy the `chrome` folder from `optional-chrome` into the profile folder.
4. Restart the browser.

In Waterfox it also removes the edge above the status bar at the bottom and
gives the bar the color the new tab page fades into.

> [!NOTE]
> `userChrome.css` is not an official API and may need adjustments after major browser updates.

## 🩺 Troubleshooting

- **Settings and custom images are gone after a restart:** temporary add-ons
  are removed when the browser closes. Install the `.xpi` instead.
- **A line remains below the toolbars on the new tab page:** check that the
  seamless option is on, and use the optional `userChrome.css`.

## 💬 Support

Report problems in the [issue tracker](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/issues).

## 📄 License

GNU Affero General Public License v3.0 only. See [LICENSE](LICENSE).
