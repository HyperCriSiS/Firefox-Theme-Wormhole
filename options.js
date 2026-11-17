// Checkboxes and the color field are stored under their id; the HTML
// "checked" or "value" attribute is the default.
for (const box of document.querySelectorAll("input[type=checkbox], input[type=color]")) {
  const prop = box.type === "checkbox" ? "checked" : "value";
  browser.storage.local.get(box.id).then(stored => {
    if (box.id in stored) box[prop] = stored[box.id];
  });
  box.addEventListener("change", () => browser.storage.local.set({ [box.id]: box[prop] }));
}

for (const box of document.querySelectorAll("fieldset[data-key]")) {
  const { key, default: fallback } = box.dataset;
  const preview = box.querySelector("img");
  const show = stored => { preview.src = stored[key] || fallback; };

  browser.storage.local.get(key).then(show);

  box.querySelector("input").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      browser.storage.local.set({ [key]: reader.result });
      show({ [key]: reader.result });
    };
    reader.readAsDataURL(file);
  });

  box.querySelector("button").addEventListener("click", () => {
    browser.storage.local.remove(key);
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
  await browser.storage.local.set({
    headerImage: part(0, strip, "image/png"),
    newtabImage: part(strip, image.height - strip, "image/jpeg")
  });
  location.reload();
});

// Suggest colors: the bottom row of the new tab background for the fade,
// the average hue of the header, kept dark, for menus, and the strongest
// vivid hue of both images, brightened, for the accent.
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
  const colors = {
    bottomColor: hex(average(page.data, page.data.length - page.width * 4)),
    menuColor: hex(tone.map(v => v * 34 / Math.max(...tone, 1))),
    accentColor: hex(accent.map(v => v * 245 / Math.max(...accent)))
  };
  for (const [id, value] of Object.entries(colors)) document.getElementById(id).value = value;
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
  await browser.storage.local.set(Object.fromEntries(SET_KEYS.filter(key => typeof set[key] === "string").map(key => [key, set[key]])));
  location.reload();
});

const prompt = document.getElementById("prompt");
fetch("image-prompt.txt").then(r => r.text()).then(text => { prompt.value = text; });
document.getElementById("copy-prompt").addEventListener("click", () => {
  navigator.clipboard.writeText(prompt.value);
});
