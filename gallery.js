// Shared by background.js and options.js: the gallery location and a check
// for entries from its index.json, which is remote data. Ids, release names
// and paths may only hold safe characters, so they cannot point elsewhere.
const GALLERY = "https://raw.githubusercontent.com/HyperCriSiS/Wormhole-Gallery/main/";
const RELEASES = "https://github.com/HyperCriSiS/Wormhole-Gallery/releases/download/";
const GALLERY_ORIGINS = ["https://raw.githubusercontent.com/*", "https://github.com/HyperCriSiS/*", "https://*.githubusercontent.com/*"];

function validSet(entry) {
  const name = /^[\w.-]+$/;
  return Boolean(entry) && name.test(entry.id) && name.test(entry.release)
    && typeof entry.title === "string" && Array.isArray(entry.tags)
    && typeof entry.category === "string" && typeof entry.style === "string"
    && /^[\w./-]+$/.test(entry.preview) && !entry.preview.includes("..")
    && ["bottom", "menu", "accent"].every(key => /^#[0-9a-f]{6}$/i.test(entry.colors?.[key]));
}

async function loadGallery() {
  const response = await fetch(GALLERY + "index.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Gallery index: HTTP ${response.status}`);
  const index = await response.json();
  return Array.isArray(index) ? index.filter(validSet) : [];
}

// The categories and styles the user picked on the settings page; an empty
// list means all. Used for browsing and for the automatic change.
function matchesFilter(entry, filter = {}) {
  const { categories = [], styles = [] } = filter;
  return (!categories.length || categories.includes(entry.category))
    && (!styles.length || styles.includes(entry.style));
}
