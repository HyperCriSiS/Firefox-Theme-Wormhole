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

async function applyTheme() {
  const { headerImage } = await browser.storage.local.get("headerImage");
  const images = { theme_frame: headerImage || eventHorizonTheme.images.theme_frame };
  browser.theme.update({ ...eventHorizonTheme, images }).catch(console.error);
}

// Optional: show the Wormhole page instead of the home page (new windows,
// Home button). Off by default; enabled on the options page.
browser.tabs.onUpdated.addListener(async (tabId, { url }) => {
  if (url !== "about:home") return;
  const { homepage } = await browser.storage.local.get("homepage");
  if (homepage) browser.tabs.update(tabId, { url: "newtab.html", loadReplace: true });
});

applyTheme();
browser.storage.onChanged.addListener(changes => {
  if ("headerImage" in changes) applyTheme();
});
browser.runtime.onInstalled.addListener(applyTheme);
browser.runtime.onStartup.addListener(applyTheme);
