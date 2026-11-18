// Checkboxes and the color field are stored under their id; the HTML
// "checked" or "value" attribute is the default.
for (const box of document.querySelectorAll("input[type=checkbox], input[type=color][id]")) {
  const prop = box.type === "checkbox" ? "checked" : "value";
  browser.storage.local.get(box.id).then(stored => {
    if (box.id in stored) box[prop] = stored[box.id];
    if (box.hexField) box.hexField.value = box.value;
  });
  box.addEventListener("change", () => browser.storage.local.set({ [box.id]: box[prop] }));
  if (box.type !== "color") continue;

  // The native Windows color dialog has no hex field, so offer one here.
  const hexField = Object.assign(document.createElement("input"), {
    type: "text", size: 8, maxLength: 7, spellcheck: false, value: box.value
  });
  hexField.setAttribute("aria-label", "Hex value");
  box.after(hexField);
  box.hexField = hexField;
  box.addEventListener("input", () => { hexField.value = box.value; });
  hexField.addEventListener("change", () => {
    const hex = hexField.value.trim().replace(/^#?/, "#").toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(hex)) { hexField.value = box.value; return; }
    box.value = hexField.value = hex;
    browser.storage.local.set({ [box.id]: hex });
  });
}

// Firefox silently ignores theme images that are too large (a 1.9 MB PNG
// header showed nothing), so big headers are stored as JPEG instead.
async function fitHeader(file, dataUrl) {
  if (file.size < 1024 * 1024) return dataUrl;
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", .9);
}

// Each image keeps its unadjusted original next to it (see "Adjust").
const original = key => key.replace("Image", "Original");

for (const box of document.querySelectorAll("fieldset[data-key]")) {
  const { key, default: fallback } = box.dataset;
  const preview = box.querySelector("img");
  const show = stored => { preview.src = stored[key] || fallback; };

  browser.storage.local.get(key).then(show);

  box.querySelector("input").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const value = key === "headerImage" ? await fitHeader(file, reader.result) : reader.result;
      await browser.storage.local.set({ [key]: value, [original(key)]: value });
      show({ [key]: value });
    };
    reader.readAsDataURL(file);
  });

  box.querySelector("button").addEventListener("click", () => {
    browser.storage.local.remove([key, original(key)]);
    box.querySelector("input").value = "";
    show({});
  });
}

// Fallback: split one image into header (top 12:1 strip) and new tab
// background (the rest), scaled to the 3840 px header width.
document.querySelector("#split input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const image = await createImageBitmap(file);
  const width = 3840;
  const scale = width / image.width;
  const strip = image.width / 12;
  const part = (top, height, type) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(image, 0, top, image.width, height, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(type, .92);
  };
  const headerImage = part(0, strip, "image/jpeg");
  const newtabImage = part(strip, image.height - strip, "image/jpeg");
  await browser.storage.local.set({ headerImage, newtabImage, headerOriginal: headerImage, newtabOriginal: newtabImage });
  location.reload();
});

// Suggest colors: the bottom row of the new tab background for the fade,
// the average hue of the header, kept dark (or light for light pictures),
// for menus, and the strongest vivid hue of both images for the accent.
const hex = rgb => "#" + rgb.map(v => Math.round(Math.min(255, v)).toString(16).padStart(2, "0")).join("");
const pixels = async (src, size) => {
  const image = await createImageBitmap(await (await fetch(src)).blob());
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.max(1, Math.round(size * image.height / image.width));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width };
};
const average = (data, from = 0) => {
  const sum = [0, 0, 0];
  for (let i = from; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
  return sum.map(v => v / ((data.length - from) / 4));
};
document.getElementById("suggest").addEventListener("click", async () => {
  const [header, newtab] = document.querySelectorAll("fieldset[data-key] img");
  const top = await pixels(header.src, 120);
  const page = await pixels(newtab.src, 120);
  const buckets = Array.from({ length: 12 }, () => ({ score: 0, sum: [0, 0, 0] }));
  for (const { data } of [top, page]) for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = data.slice(i, i + 3), max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 115 || max - min < .35 * max) continue;
    const hue = max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min);
    const bucket = buckets[Math.floor(((hue + 6) % 6) * 2)];
    const weight = (max - min) * max * max;
    bucket.score += weight;
    [r, g, b].forEach((v, c) => { bucket.sum[c] += v * weight; });
  }
  const vivid = buckets.reduce((a, b) => (b.score > a.score ? b : a));
  const accent = vivid.score ? vivid.sum.map(v => v / vivid.score) : [99, 242, 255];
  const tone = average(top.data);
  // Light pictures get a light menu color (the add-on then uses dark text)
  // and a darker accent that stays readable on it.
  const light = (.2126 * tone[0] + .7152 * tone[1] + .0722 * tone[2]) / 255 > .6;
  const colors = {
    bottomColor: hex(average(page.data, page.data.length - page.width * 4)),
    menuColor: hex(light ? tone.map(v => 232 + (v - Math.max(...tone)) * .25) : tone.map(v => v * 34 / Math.max(...tone, 1))),
    accentColor: hex(accent.map(v => v * (light ? 155 : 245) / Math.max(...accent)))
  };
  for (const [id, value] of Object.entries(colors)) {
    const box = document.getElementById(id);
    box.value = box.hexField.value = value;
  }
  browser.storage.local.set(colors);
});

// Sets: both images and the three colors in one JSON file.
const SET_KEYS = ["headerImage", "newtabImage", "bottomColor", "menuColor", "accentColor"];
document.getElementById("export").addEventListener("click", async () => {
  const set = await browser.storage.local.get(SET_KEYS);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(set)], { type: "application/json" }));
  link.download = "wormhole-set.json";
  link.click();
});
document.getElementById("import").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const set = JSON.parse(await file.text());
  const values = Object.fromEntries(SET_KEYS.filter(key => typeof set[key] === "string").map(key => [key, set[key]]));
  for (const key of ["headerImage", "newtabImage"]) if (values[key]) values[original(key)] = values[key];
  await browser.storage.local.set(values);
  location.reload();
});

// Adjust: brightness, saturation, tint and a shade behind the toolbars are
// baked into new images, always computed from the originals, so they can be
// changed or reset any time without losing quality.
const ADJUST_DEFAULTS = { brightness: 100, saturation: 100, tint: 0, tintColor: "#ff9a3c", top: 0 };
const controls = [...document.querySelectorAll("[data-adjust]")];
const showAdjust = values => {
  for (const control of controls) control.value = { ...ADJUST_DEFAULTS, ...values }[control.dataset.adjust];
};
browser.storage.local.get("adjust").then(({ adjust }) => showAdjust(adjust));

async function render(src, isHeader, adjust) {
  const image = await createImageBitmap(await (await fetch(src)).blob());
  const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
  const ctx = canvas.getContext("2d");
  ctx.filter = `brightness(${adjust.brightness}%) saturate(${adjust.saturation}%)`;
  ctx.drawImage(image, 0, 0);
  ctx.filter = "none";
  if (adjust.tint) {
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = adjust.tint / 100;
    ctx.fillStyle = adjust.tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  if (isHeader && adjust.top) {
    // Positive darkens, negative lightens the strip behind tabs and toolbars.
    const rgb = adjust.top > 0 ? "0, 0, 0" : "255, 255, 255";
    const shade = ctx.createLinearGradient(0, 0, 0, canvas.height * .4);
    shade.addColorStop(0, `rgba(${rgb}, ${Math.abs(adjust.top) / 100})`);
    shade.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, canvas.height * .4);
  }
  return canvas.toDataURL("image/jpeg", .92);
}

async function applyAdjust() {
  const adjust = Object.fromEntries(controls.map(c => [c.dataset.adjust, c.type === "color" ? c.value : Number(c.value)]));
  const stored = await browser.storage.local.get(["headerImage", "newtabImage", "headerOriginal", "newtabOriginal"]);
  const previews = document.querySelectorAll("fieldset[data-key] img");
  const headerOriginal = stored.headerOriginal || stored.headerImage || previews[0].src;
  const newtabOriginal = stored.newtabOriginal || stored.newtabImage || previews[1].src;
  const headerImage = await render(headerOriginal, true, adjust);
  const newtabImage = await render(newtabOriginal, false, adjust);
  await browser.storage.local.set({ adjust, headerOriginal, newtabOriginal, headerImage, newtabImage });
  previews[0].src = headerImage;
  previews[1].src = newtabImage;
}
for (const control of controls) control.addEventListener("change", applyAdjust);
document.getElementById("adjust-reset").addEventListener("click", () => {
  showAdjust({});
  applyAdjust();
});

// Gallery: optional, needs the GitHub permission, which Firefox only grants
// on a click. The background script downloads and applies a chosen set.
const GALLERY = "https://raw.githubusercontent.com/HyperCriSiS/Wormhole-Gallery/main/";
const ORIGINS = ["https://raw.githubusercontent.com/*", "https://github.com/*", "https://*.githubusercontent.com/*"];
const galleryGrid = document.getElementById("gallery-grid");
let gallerySets = [];

function showGallery() {
  const words = document.getElementById("gallery-search").value.toLowerCase().split(/\s+/).filter(Boolean);
  galleryGrid.replaceChildren(...gallerySets
    .filter(set => words.every(word => set.title.toLowerCase().includes(word) || set.tags.some(tag => tag.startsWith(word))))
    .map(set => {
      const figure = document.createElement("figure");
      const image = Object.assign(document.createElement("img"), { src: GALLERY + set.preview, alt: set.title, loading: "lazy" });
      const caption = document.createElement("figcaption");
      const use = Object.assign(document.createElement("button"), { type: "button", textContent: "Use" });
      use.addEventListener("click", async () => {
        use.disabled = true;
        use.textContent = "Loading…";
        await browser.runtime.sendMessage({ gallerySet: set });
        location.reload();
      });
      caption.append(set.title, use);
      figure.append(image, caption);
      return figure;
    }));
}

document.getElementById("gallery-open").addEventListener("click", async () => {
  if (!await browser.permissions.request({ origins: ORIGINS })) return;
  gallerySets = await (await fetch(GALLERY + "index.json", { cache: "no-store" })).json();
  document.getElementById("gallery-view").hidden = false;
  showGallery();
});
document.getElementById("gallery-search").addEventListener("input", showGallery);
document.getElementById("daily").addEventListener("change", async event => {
  if (!event.target.checked) return;
  if (!await browser.permissions.request({ origins: ORIGINS })) {
    event.target.checked = false;
    browser.storage.local.set({ daily: false });
    return;
  }
  await browser.storage.local.remove("dailyDate");
  await browser.runtime.sendMessage({ daily: true });
  location.reload();
});

const prompt = document.getElementById("prompt");
fetch("image-prompt.txt").then(r => r.text()).then(text => { prompt.value = text; });
document.getElementById("copy-prompt").addEventListener("click", () => {
  navigator.clipboard.writeText(prompt.value);
});
