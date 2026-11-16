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

const prompt = document.getElementById("prompt");
fetch("image-prompt.txt").then(r => r.text()).then(text => { prompt.value = text; });
document.getElementById("copy-prompt").addEventListener("click", () => {
  navigator.clipboard.writeText(prompt.value);
});
