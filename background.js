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

// Relative brightness of a #rrggbb color, 0 (black) to 1 (white).
function lightness(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return .2126 * r + .7152 * g + .0722 * b;
}

// Menu and accent color from the options page drive every themed surface
// that is not the header image, so menus match the user's own images.
async function applyTheme() {
  const { headerImage, menuColor, accentColor } =
    await browser.storage.local.get(["headerImage", "menuColor", "accentColor"]);
  const images = { theme_frame: headerImage || eventHorizonTheme.images.theme_frame };
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
  // A light menu color means a light picture: switch text and icons to dark.
  const light = menuColor && lightness(menuColor) > .55;
  if (light) {
    Object.assign(colors, {
      tab_background_text: "#3b4654",
      tab_selected: "rgba(255, 255, 255, 0.35)",
      tab_text: "#111821",
      toolbar_text: "#1a2330",
      bookmark_text: "#1a2330",
      toolbar_vertical_separator: "rgba(20, 30, 45, 0.18)",
      toolbar_field_text: "#111821",
      toolbar_field_text_focus: "#000000",
      toolbar_field_border: mix(menuColor, "#000000", .18),
      toolbar_field_highlight_text: "#ffffff",
      icons: "#26313d",
      popup_text: "#151c25",
      popup_border: mix(menuColor, "#000000", .15),
      popup_highlight: mix(menuColor, "#000000", .07),
      sidebar_text: "#1a2330",
      sidebar_border: mix(menuColor, "#000000", .1),
      sidebar_highlight: mix(menuColor, "#000000", .07),
      ntp_text: "#151c25"
    });
  }
  const properties = light ? { color_scheme: "light", content_color_scheme: "light" } : eventHorizonTheme.properties;
  browser.theme.update({ ...eventHorizonTheme, images, colors, properties }).catch(console.error);
}

// Optional: show the new tab page instead of the home page (new windows,
// Home button). Off by default; enabled on the options page.
browser.tabs.onUpdated.addListener(async (tabId, { url }) => {
  if (url !== "about:home") return;
  const { homepage } = await browser.storage.local.get("homepage");
  if (homepage) browser.tabs.update(tabId, { url: "newtab.html", loadReplace: true });
});

// Gallery: ready-made sets from the Wormhole-Gallery repository (gallery.js).
// Only used after the user grants the optional GitHub permission.
async function asDataUrl(url) {
  // Release assets come as application/octet-stream, which Firefox does not
  // accept as a theme image, so label them as JPEG.
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const blob = new Blob([await response.blob()], { type: "image/jpeg" });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function applyGallerySet(entry) {
  if (!validSet(entry)) throw new Error("Invalid gallery set");
  const base = `${RELEASES}${entry.release}/${entry.id}`;
  const [headerImage, newtabImage] = await Promise.all([asDataUrl(`${base}-header.jpg`), asDataUrl(`${base}-wallpaper.jpg`)]);
  await browser.storage.local.remove("adjust");
  await browser.storage.local.set({
    headerImage, newtabImage, headerOriginal: headerImage, newtabOriginal: newtabImage,
    bottomColor: entry.colors.bottom, menuColor: entry.colors.menu, accentColor: entry.colors.accent,
    gallerySet: entry.id
  });
}

// Rotation through the gallery. "daily" picks the set by day number, so every
// set comes up once before any repeats; checked at startup and hourly.
// "start" takes the next set on every browser start. An older "daily: true"
// counts as "daily".
async function rotateSet(startup = false) {
  const { rotation, daily, dailyDate, rotationIndex = -1 } =
    await browser.storage.local.get(["rotation", "daily", "dailyDate", "rotationIndex"]);
  const mode = rotation || (daily ? "daily" : "off");
  const today = new Date().toDateString();
  if (mode === "off" || (mode === "daily" && dailyDate === today) || (mode === "start" && !startup)) return;
  if (!await browser.permissions.contains({ origins: GALLERY_ORIGINS })) return;
  const index = await loadGallery();
  if (!index.length) return;
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const next = mode === "daily" ? day % index.length : (rotationIndex + 1) % index.length;
  await applyGallerySet(index[next]);
  await browser.storage.local.set({ dailyDate: today, rotationIndex: next });
}

browser.runtime.onMessage.addListener(message => {
  if (message.gallerySet) return applyGallerySet(message.gallerySet);
  if (message.rotate) return rotateSet(true);
});
browser.alarms.create("daily", { periodInMinutes: 60 });
browser.alarms.onAlarm.addListener(() => rotateSet().catch(console.error));
browser.runtime.onStartup.addListener(() => rotateSet(true).catch(console.error));
rotateSet().catch(console.error);

applyTheme();
browser.storage.onChanged.addListener(changes => {
  if (["headerImage", "menuColor", "accentColor"].some(key => key in changes)) applyTheme();
});
browser.runtime.onInstalled.addListener(applyTheme);
browser.runtime.onStartup.addListener(applyTheme);
