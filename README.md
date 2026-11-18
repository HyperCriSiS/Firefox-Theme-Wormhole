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
- Optional: use the new tab page for new windows and the Home button too.
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
| Ready-made sets | Off | Browse the [Wormhole Gallery](https://github.com/HyperCriSiS/Wormhole-Gallery), search by tag and use a set with one click, or get a new set every day. Asks once for access to GitHub; nothing is downloaded before you opt in. |
| Your picture | Built-in wormhole | One wide image (16:9 or 2:1). The top strip becomes the header, the rest the new tab background, so they always line up. |
| Header image and new tab background | Built-in wormhole and space scene | Advanced: two separate images instead of one. The header is painted across all toolbars, anchored top right; about 3840 x 320 px works best. |
| Adjust the picture | Off | Brightness, saturation, tint and a shade behind the toolbars, baked into both images. The originals are kept, so you can change or reset it any time. |
| Bottom color | `#02050c` | Color the new tab page fades into at the bottom. Waterfox only: use the same value for `--wormhole-statusbar-color` in `userChrome.css`. |
| Menu color | `#090e18` | Menus, panels, sidebar and address bar. A dark tone for dark pictures; a light tone switches the browser to dark text and icons for light pictures. |
| Accent color | `#63f2ff` | Selected tab, focused address bar and highlighted menu text. |
| Suggest colors from the images | Button | Fills the three colors from your images: the bottom row for the fade, a dark tone for menus, the most vivid hue for the accent. Adjust them afterwards if you like. |
| Continue the header image seamlessly | On | Continues the header image on the new tab page. Off shows a visible edge below the toolbars. |
| Also use this new tab page for new windows and the Home button | Off | Replaces the home page in new windows and for the Home button. |
| Share a set | Buttons | Exports both images and the three colors as one JSON file, or imports such a file. |

## 🎨 Custom images

Upload one wide picture on the settings page, or two separate images if you
prefer. Your files stay in the
add-on's local storage and are never uploaded.

How the parts fit together:

- **Header image:** painted behind tabs and toolbars, anchored top right at its
  original size. The new tab page shows the rest of the same image directly
  below the toolbars, so header and page line up with any image. About
  3840 x 320 px covers wide screens and the bookmarks toolbar.
- **Transition:** the header continuation fades out into the new tab
  background. It looks seamless when the bottom of the header image and the
  top of the background share colors.
- **New tab background:** fills the page and is cropped to the window
  (centered). Its last 48 px fade into the bottom color from the settings
  (default `#02050c`), so the bottom never shows an edge.
- **Waterfox status bar (Waterfox only):** with `userChrome.css` installed, the
  bar below the page takes `--wormhole-statusbar-color` from the top of that
  file. Set it to the same bottom color. Firefox has no such bar.
- **Menu and accent color:** menus, panels, sidebar, address bar and the
  selected tab use these two colors from the settings, so they match your
  images in Firefox and Waterfox, with or without `userChrome.css`.
- **One picture:** the theme cuts the top strip of your picture into the
  header and the rest into the new tab background, so both always line up.
- **Light pictures:** pick a light menu color and the browser switches to dark
  text and icons, light menus and a light sidebar.

### Create matching images with AI

[image-prompt.txt](image-prompt.txt) is a prompt for image generators. Paste
it into the AI tool of your choice, replace the last line with your idea, and
it describes one wide picture with the safe areas and fades this theme needs,
dark or light. It also asks the AI for three matching colors: the bottom color
(settings and, in Waterfox, `--wormhole-statusbar-color`), the menu color and
the accent color. The settings page shows the same prompt with a copy button.

## 🧵 Seamless toolbar edge (optional)

Add-ons cannot change files in the browser profile, so this part is always a
manual step, also when the theme comes from an add-on store. Download
`wormhole-userchrome-<version>.zip` from the
[latest release](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/releases/latest)
or take the folder from a checkout.

Firefox draws a thin line between the toolbars and the page that a theme
cannot remove. `optional-chrome/chrome/userChrome.css` removes it and makes
all toolbars transparent. It takes menu and accent colors from the theme, so
it never needs editing for custom images, except the Waterfox status bar color.

1. Set `toolkit.legacyUserProfileCustomizations.stylesheets` to `true` in `about:config`.
2. Open `about:support` and click **Open Folder** next to **Profile Folder**.
3. Create a folder named `chrome` in the profile folder if it does not exist and put `userChrome.css` into it.
4. Restart the browser.

In Waterfox it also removes the edge above the status bar at the bottom and
gives the bar the color the new tab page fades into.

Waterfox browser styles (Settings, Appearance): the theme works with Nova,
Proton and Photon. Proton and Photon give the most seamless picture. Nova
keeps its rounded edges around the page by design, so the picture shows a
soft frame there.

> [!NOTE]
> `userChrome.css` is not an official API and may need adjustments after major browser updates.

## 🩺 Troubleshooting

- **Settings and custom images are gone after a restart:** temporary add-ons
  are removed when the browser closes. Install the `.xpi` instead.
- **A line remains below the toolbars on the new tab page:** check that the
  seamless option is on, and use the optional `userChrome.css`.

## 💬 Support

Report problems in the [issue tracker](https://github.com/HyperCriSiS/Firefox-Theme-Wormhole/issues).

## 🧩 More add-ons

Like Wormhole? These add-ons are by the same author.

**Firefox**

- Sprachverstand for [Firefox](https://addons.mozilla.org/firefox/addon/sprachverstand/) and [Thunderbird](https://addons.thunderbird.net/thunderbird/addon/sprachverstand/): removes gender language from websites and emails.

**Thunderbird** (Proton Mail and more)

- [All Mail Buddy](https://github.com/Broton-Your-bro-for-Proton/All-Mail-Buddy): shows the real folder of every message in Proton Mail Bridge's All Mail folder and makes delete, move, archive and junk act on it.
- [Alias Buddy](https://github.com/Broton-Your-bro-for-Proton/Alias-Buddy): send as your SimpleLogin alias without handling reverse aliases, with a guard against leaking your real address.
- [Sieve Buddy](https://github.com/Broton-Your-bro-for-Proton/Sieve-Buddy): Sieve filter manager for Proton Mail and any ManageSieve server, with rules from mails and a simulator.

## 📄 License

GNU Affero General Public License v3.0 only. See [LICENSE](LICENSE).
