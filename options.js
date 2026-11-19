// One status line for every action on this page.
const status = document.getElementById("status");
function say(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
  status.hidden = !message;
}
const failed = what => error => say(`${what} failed: ${error.message || error}`, true);

// Previews, colors and the rotation follow storage, so nothing on this page
// needs a reload when a set changes, also when the background switches it.
const refreshers = [];
browser.storage.onChanged.addListener(changes => {
  for (const refresh of refreshers) refresh(changes);
});

// Checkboxes and the color field are stored under their id; the HTML
// "checked" or "value" attribute is the default.
for (const box of document.querySelectorAll("input[type=checkbox], input[type=color][id]")) {
  const prop = box.type === "checkbox" ? "checked" : "value";
  const load = stored => {
    box[prop] = box.id in stored ? stored[box.id] : box.type === "checkbox" ? box.defaultChecked : box.defaultValue;
    if (box.hexField) box.hexField.value = box.value;
  };
  browser.storage.local.get(box.id).then(load);
  refreshers.push(changes => {
    if (box.id in changes) load(changes[box.id].newValue === undefined ? {} : { [box.id]: changes[box.id].newValue });
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

// Every stored picture goes through here: at most 3840 px wide (more is never
// visible) and JPEG, because Firefox silently drops large theme images and
// storage holds them as data URLs. Smaller pictures are not upscaled.
async function fitImage(source, width = 3840) {
  const image = await createImageBitmap(source);
  const scale = Math.min(1, width / image.width);
  const canvas = Object.assign(document.createElement("canvas"), {
    width: Math.round(image.width * scale), height: Math.round(image.height * scale)
  });
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", .9);
}

// The user's own picture replaces a gallery set and stops the rotation.
const ownPicture = { daily: false, rotation: "off" };
const dropGallery = () => {
  document.getElementById("rotation").value = "off";
  return browser.storage.local.remove("gallerySet");
};

// Each image keeps its unadjusted original next to it (see "Adjust").
const original = key => key.replace("Image", "Original");

for (const box of document.querySelectorAll("fieldset[data-key]")) {
  const { key, default: fallback } = box.dataset;
  const preview = box.querySelector("img");
  const show = stored => { preview.src = stored[key] || fallback; };

  browser.storage.local.get(key).then(show);
  refreshers.push(changes => { if (key in changes) show({ [key]: changes[key].newValue }); });

  box.querySelector("input").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      say("Loading picture…");
      const value = await fitImage(file);
      await dropGallery();
      // A new picture starts unadjusted; the original is kept only once a
      // slider is used.
      await browser.storage.local.remove([original(key), "adjust"]);
      await browser.storage.local.set({ [key]: value, ...ownPicture });
      showAdjust({});
      show({ [key]: value });
      say("");
    } catch (error) {
      failed("Loading the picture")(error);
    }
  });

  box.querySelector("button").addEventListener("click", () => {
    browser.storage.local.remove([key, original(key), "adjust", "gallerySet"]);
    browser.storage.local.set(ownPicture);
    showAdjust({});
    box.querySelector("input").value = "";
    show({});
  });
}

// Fallback: split one image into header (top 12:1 strip) and new tab
// background (the rest), scaled to the 3840 px header width.
document.querySelector("#split input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    say("Splitting picture…");
    const image = await createImageBitmap(file);
    const strip = image.width / 12;
    const part = (top, height, width) => {
      const canvas = Object.assign(document.createElement("canvas"), { width, height: Math.round(height * width / image.width) });
      canvas.getContext("2d").drawImage(image, 0, top, image.width, height, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", .9);
    };
    // The header must span the toolbars of wide screens, so it is always
    // 3840 px wide; the background is only scaled down.
    const headerImage = part(0, strip, 3840);
    const newtabImage = part(strip, image.height - strip, Math.min(3840, image.width));
    await dropGallery();
    await browser.storage.local.remove(["headerOriginal", "newtabOriginal", "adjust"]);
    await browser.storage.local.set({ headerImage, newtabImage, ...ownPicture });
    showAdjust({});
    say("");
  } catch (error) {
    failed("Splitting the picture")(error);
  }
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

document.getElementById("reset-colors").addEventListener("click", () => {
  browser.storage.local.remove(["bottomColor", "menuColor", "accentColor"]);
});

// The home page option needs the optional "tabs" permission to see when a
// tab opens the home page; it is requested on the click that turns it on.
document.getElementById("homepage").addEventListener("change", async event => {
  if (!event.target.checked) return;
  if (!await browser.permissions.request({ permissions: ["tabs"] }).catch(() => false)) {
    event.target.checked = false;
    browser.storage.local.set({ homepage: false });
    say("The home page option needs access to tabs.", true);
  }
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
// A set file may come from anyone: accept only picture data and hex colors.
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const COLOR = /^#[0-9a-f]{6}$/i;
document.getElementById("import").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    say("Importing set…");
    const set = JSON.parse(await file.text());
    const values = {};
    for (const key of ["bottomColor", "menuColor", "accentColor"]) if (COLOR.test(set[key])) values[key] = set[key];
    for (const key of ["headerImage", "newtabImage"]) {
      if (IMAGE.test(set[key])) values[key] = await fitImage(await (await fetch(set[key])).blob());
    }
    if (!Object.keys(values).length) throw new Error("no pictures or colors found in this file");
    await dropGallery();
    await browser.storage.local.remove(["headerOriginal", "newtabOriginal", "adjust"]);
    await browser.storage.local.set({ ...values, ...ownPicture });
    showAdjust({});
    say("Set imported.");
  } catch (error) {
    failed("Importing the set")(error);
  }
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
  const stored = await browser.storage.local.get(["headerImage", "newtabImage", "headerOriginal", "newtabOriginal", "adjust"]);
  // Originals are null for the built-in pictures. Once adjusted, the stored
  // image is a rendering, never an original.
  const unadjusted = key => stored[original(key)] || (stored.adjust ? null : stored[key]) || null;
  const headerOriginal = unadjusted("headerImage");
  const newtabOriginal = unadjusted("newtabImage");
  const previews = document.querySelectorAll("fieldset[data-key] img");
  const builtIn = [...document.querySelectorAll("fieldset[data-key]")].map(box => box.dataset.default);
  if (controls.every(c => String(adjust[c.dataset.adjust]) === String(ADJUST_DEFAULTS[c.dataset.adjust]))) {
    // Back to the untouched originals, without re-encoding them.
    await browser.storage.local.remove(["adjust", "headerOriginal", "newtabOriginal", "headerImage", "newtabImage"]);
    await browser.storage.local.set({
      ...(headerOriginal && { headerImage: headerOriginal }),
      ...(newtabOriginal && { newtabImage: newtabOriginal })
    });
    previews[0].src = headerOriginal || builtIn[0];
    previews[1].src = newtabOriginal || builtIn[1];
    return;
  }
  const headerImage = await render(headerOriginal || builtIn[0], true, adjust);
  const newtabImage = await render(newtabOriginal || builtIn[1], false, adjust);
  await browser.storage.local.set({
    adjust, headerImage, newtabImage,
    ...(headerOriginal && { headerOriginal }), ...(newtabOriginal && { newtabOriginal })
  });
  previews[0].src = headerImage;
  previews[1].src = newtabImage;
}
// One run at a time; the sliders wait while a run renders.
async function adjustSafely() {
  for (const control of controls) control.disabled = true;
  say("Applying…");
  try {
    await applyAdjust();
    say("");
  } catch (error) {
    failed("Adjusting the picture")(error);
  } finally {
    for (const control of controls) control.disabled = false;
  }
}
for (const control of controls) control.addEventListener("change", adjustSafely);
document.getElementById("adjust-reset").addEventListener("click", () => {
  showAdjust({});
  adjustSafely();
});

// Gallery: optional, needs the GitHub permission, which Firefox only grants
// on a click. The background script downloads and applies a chosen set.
// The request must start before any await to count as a click; if Firefox
// still refuses it, an earlier grant is enough.
const askGallery = () => browser.permissions.request({ origins: GALLERY_ORIGINS })
  .catch(() => browser.permissions.contains({ origins: GALLERY_ORIGINS }));
const galleryGrid = document.getElementById("gallery-grid");
let gallerySets = [];
let galleryFilter = {};
browser.storage.local.get("galleryFilter").then(stored => { galleryFilter = stored.galleryFilter || {}; });

// Checkbox lists built from the gallery itself, so new categories and styles
// show up without an add-on update.
function buildFilters() {
  for (const box of document.querySelectorAll(".gallery-filter")) {
    const field = box.dataset.field;
    const key = field === "category" ? "categories" : "styles";
    const values = [...new Set(gallerySets.map(set => set[field]))].sort();
    // Drop picks that no longer exist in the gallery.
    galleryFilter = { ...galleryFilter, [key]: (galleryFilter[key] || []).filter(value => values.includes(value)) };
    box.replaceChildren(box.querySelector("b"), ...values.map(value => {
      const check = Object.assign(document.createElement("input"), {
        type: "checkbox", checked: (galleryFilter[key] || []).includes(value)
      });
      check.addEventListener("change", () => {
        const picked = new Set(galleryFilter[key] || []);
        check.checked ? picked.add(value) : picked.delete(value);
        galleryFilter = { ...galleryFilter, [key]: [...picked] };
        browser.storage.local.set({ galleryFilter });
        showGallery();
      });
      browser.storage.local.set({ galleryFilter });
      const label = document.createElement("label");
      label.append(check, value);
      return label;
    }));
  }
}
const showError = failed("Loading the gallery");

function showGallery() {
  const words = document.getElementById("gallery-search").value.toLowerCase().split(/\s+/).filter(Boolean);
  galleryGrid.replaceChildren(...gallerySets
    .filter(set => matchesFilter(set, galleryFilter))
    .filter(set => words.every(word => set.title.toLowerCase().includes(word) || set.tags.some(tag => String(tag).startsWith(word))))
    .map(set => {
      const figure = document.createElement("figure");
      const image = Object.assign(document.createElement("img"), { src: GALLERY + set.preview, alt: set.title, loading: "lazy" });
      const caption = document.createElement("figcaption");
      const use = Object.assign(document.createElement("button"), { type: "button", textContent: "Use" });
      use.setAttribute("aria-label", `Use ${set.title}`);
      use.addEventListener("click", async () => {
        use.disabled = true;
        use.textContent = "Loading…";
        try {
          await browser.runtime.sendMessage({ gallerySet: set });
          showAdjust({});
          say(`Using "${set.title}".`);
          use.disabled = false;
          use.textContent = "Use";
        } catch (error) {
          showError(error);
          use.disabled = false;
          use.textContent = "Use";
        }
      });
      caption.append(set.title, use);
      figure.append(image, caption);
      return figure;
    }));
}

document.getElementById("gallery-open").addEventListener("click", async () => {
  if (!await askGallery()) return;
  try {
    gallerySets = await loadGallery();
    say("");
    document.getElementById("gallery-view").hidden = false;
    buildFilters();
    showGallery();
  } catch (error) {
    showError(error);
  }
});
document.getElementById("gallery-search").addEventListener("input", showGallery);
const rotation = document.getElementById("rotation");
browser.storage.local.get(["rotation", "daily"]).then(async stored => {
  rotation.value = stored.rotation || (stored.daily ? "daily" : "off");
  if (rotation.value !== "off" && !await browser.permissions.contains({ origins: GALLERY_ORIGINS })) {
    say("Access to GitHub was removed, so the automatic change is paused. Choose it again to allow access.", true);
  }
});
refreshers.push(changes => { if ("rotation" in changes) rotation.value = changes.rotation.newValue || "off"; });
rotation.addEventListener("change", async () => {
  if (rotation.value === "off") {
    browser.storage.local.set({ rotation: "off", daily: false });
    return;
  }
  try {
    if (!await askGallery()) throw new Error("permission denied");
    await browser.storage.local.set({ rotation: rotation.value, daily: false });
    await browser.storage.local.remove("dailyDate");
    await browser.runtime.sendMessage({ rotate: true });
    say("");
  } catch (error) {
    rotation.value = "off";
    browser.storage.local.set({ rotation: "off", daily: false });
    showError(error);
  }
});

const prompt = document.getElementById("prompt");
fetch("image-prompt.txt").then(r => r.text()).then(text => { prompt.value = text; });
document.getElementById("copy-prompt").addEventListener("click", () => {
  navigator.clipboard.writeText(prompt.value);
});
