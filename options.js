// Checkboxes and the color field are stored under their id; the HTML
// "checked" or "value" attribute is the default.
for (const box of document.querySelectorAll("input[type=checkbox], input[type=color]")) {
  const prop = box.type === "checkbox" ? "checked" : "value";
  browser.storage.local.get(box.id).then(stored => {
    if (box.id in stored) box[prop] = stored[box.id];
  });
  box.addEventListener("change", () => browser.storage.local.set({ [box.id]: box[prop] }));
}

for (const box of document.querySelectorAll("fieldset")) {
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

const prompt = document.getElementById("prompt");
fetch("image-prompt.txt").then(r => r.text()).then(text => { prompt.value = text; });
document.getElementById("copy-prompt").addEventListener("click", () => {
  navigator.clipboard.writeText(prompt.value);
});
