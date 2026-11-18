const eventHorizonTheme = {
  images: {
    theme_frame: "images/theme_frame.png"
  },
  colors: {
    frame: "#02050c",
    frame_inactive: "#030610",
    tab_background_text: "#aab8c9",
    tab_selected: "rgba(7, 12, 26, 0.24)",
    tab_text: "#f6fbff",
    tab_line: "#63f2ff",
    tab_loading: "#d85cff",
    toolbar: "rgba(0, 0, 0, 0)",
    toolbar_text: "#deebf7",
    bookmark_text: "#deebf7",
    toolbar_top_separator: "rgba(0, 0, 0, 0)",
    toolbar_bottom_separator: "rgba(0, 0, 0, 0)",
    toolbar_vertical_separator: "rgba(118, 156, 205, 0.16)",
    toolbar_field: "rgba(6, 12, 27, 0.78)",
    toolbar_field_text: "#eff8ff",
    toolbar_field_border: "#2f415b",
    toolbar_field_focus: "rgba(8, 16, 34, 0.88)",
    toolbar_field_text_focus: "#ffffff",
    toolbar_field_border_focus: "#56e9ff",
    toolbar_field_highlight: "#7342a5",
    toolbar_field_highlight_text: "#ffffff",
    icons: "#d4e0ec",
    icons_attention: "#6ef4ff",
    popup: "#090e18",
    popup_text: "#edf6ff",
    popup_border: "#2a3852",
    popup_highlight: "#18243e",
    popup_highlight_text: "#72f2ff",
    sidebar: "#080d16",
    sidebar_text: "#d3deeb",
    sidebar_border: "#202b3d",
    sidebar_highlight: "#1b2740",
    sidebar_highlight_text: "#74f2ff",
    ntp_background: "#02050c",
    ntp_card_background: "#0b1220",
    ntp_text: "#e8f4ff"
  },
  properties: {
    color_scheme: "dark",
    content_color_scheme: "dark"
  }
};

// Mixes two #rrggbb colors; share is the part of b (0 to 1).
function mix(a, b, share) {
  const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map(i =>
    Math.round(channel(a, i) * (1 - share) + channel(b, i) * share).toString(16).padStart(2, "0")
  ).join("");
}

// Menu and accent color from the options page drive every themed surface
// that is not the header image, so menus match the user's own images.
async function applyTheme() {
  const { headerImage, menuColor, accentColor } =
    await browser.storage.local.get(["headerImage", "menuColor", "accentColor"]);
  composites.clear();
  const images = { theme_frame: await frameFor(screen.width, screen.height) };
  const colors = { ...eventHorizonTheme.colors };
  if (menuColor) {
    Object.assign(colors, {
      frame: menuColor,
      frame_inactive: menuColor,
      popup: menuColor,
      popup_border: mix(menuColor, "#ffffff", .15),
      popup_highlight: mix(menuColor, "#ffffff", .08),
      sidebar: menuColor,
      sidebar_border: mix(menuColor, "#ffffff", .1),
      sidebar_highlight: mix(menuColor, "#ffffff", .08),
      toolbar_field: menuColor + "c7",
      toolbar_field_focus: menuColor + "e0",
      toolbar_field_border: mix(menuColor, "#ffffff", .18),
      ntp_card_background: menuColor
    });
  }
  if (accentColor) {
    Object.assign(colors, {
      tab_line: accentColor,
      tab_loading: accentColor,
      toolbar_field_border_focus: accentColor,
      icons_attention: accentColor,
      popup_highlight_text: accentColor,
      sidebar_highlight_text: accentColor
    });
  }
  // The picture runs on behind the sidebar, so no border line between them.
  colors.sidebar_border = "rgba(0, 0, 0, 0)";
  currentTheme = { ...eventHorizonTheme, images, colors };
  browser.theme.update(currentTheme).catch(console.error);
}

// Experiment: one screen-sized picture for header, sidebar and new tab page.
// The wallpaper is cover-fit to the screen, the header image is anchored top
// right and fades out at its bottom. Firefox draws theme_frame anchored top
// right of the window, and the new tab page shows the same picture shifted up
// by the toolbar height, so both line up. The theme draws one image pixel per
// CSS pixel (an SVG wrapper is rejected), so on HiDPI the theme gets a picture
// in CSS pixels and only the new tab page gets one in device pixels.
let currentTheme;
const composites = new Map();

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

function composite(width, height, dpr) {
  const key = `${width}x${height}@${dpr}`;
  if (!composites.has(key)) composites.set(key, compose(width, height, dpr));
  return composites.get(key);
}

function frameFor(width, height) {
  return composite(width, height, 1).then(c => c.jpg);
}

async function compose(width, height, dpr) {
  const { headerImage, newtabImage } = await browser.storage.local.get(["headerImage", "newtabImage"]);
  const [header, wallpaper] = await Promise.all([
    loadImage(headerImage || "images/theme_frame.png"),
    loadImage(newtabImage || "images/newtab-space.jpg")
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  const cover = Math.max(canvas.width / wallpaper.width, canvas.height / wallpaper.height);
  ctx.drawImage(wallpaper,
    (canvas.width - wallpaper.width * cover) / 2, (canvas.height - wallpaper.height * cover) / 2,
    wallpaper.width * cover, wallpaper.height * cover);

  // Header at its CSS size, faded like .header-continuation (40% to 100%).
  const strip = document.createElement("canvas");
  strip.width = canvas.width;
  strip.height = Math.round(header.height * dpr);
  const sctx = strip.getContext("2d");
  sctx.drawImage(header, strip.width - header.width * dpr, 0, header.width * dpr, strip.height);
  const fade = sctx.createLinearGradient(0, 0, 0, strip.height);
  fade.addColorStop(.4, "#000");
  fade.addColorStop(1, "transparent");
  sctx.globalCompositeOperation = "destination-in";
  sctx.fillStyle = fade;
  sctx.fillRect(0, 0, strip.width, strip.height);
  ctx.drawImage(strip, 0, 0);

  // JPEG keeps the theme data small; the new tab page gets a lossless PNG.
  return { png: canvas.toDataURL("image/png"), jpg: canvas.toDataURL("image/jpeg", .92) };
}

// New tab pages ask for the picture of their screen; a different size or
// scale than the current one gets its own picture for that window.
browser.runtime.onMessage.addListener(async ({ frame }, sender) => {
  if (!frame) return;
  const { width, height, dpr } = frame;
  const theme_frame = await frameFor(width, height);
  const windowId = sender.tab?.windowId;
  if (currentTheme && windowId !== undefined && theme_frame !== currentTheme.images.theme_frame) {
    browser.theme.update(windowId, { ...currentTheme, images: { theme_frame } }).catch(console.error);
  }
  return (await composite(width, height, dpr)).png;
});

// Optional: show the new tab page instead of the home page (new windows,
// Home button). Off by default; enabled on the options page.
browser.tabs.onUpdated.addListener(async (tabId, { url }) => {
  if (url !== "about:home") return;
  const { homepage } = await browser.storage.local.get("homepage");
  if (homepage) browser.tabs.update(tabId, { url: "newtab.html", loadReplace: true });
});

applyTheme();
browser.storage.onChanged.addListener(changes => {
  if (["headerImage", "newtabImage", "menuColor", "accentColor"].some(key => key in changes)) applyTheme();
});
browser.runtime.onInstalled.addListener(applyTheme);
browser.runtime.onStartup.addListener(applyTheme);
