const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const particleLayer = document.getElementById("particle-layer");

function looksLikeUrl(value) {
  const text = value.trim();
  if (!text || /\s/.test(text)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(text)) return true;
  return /^[^./\s]+(\.[^./\s]+)+(\/.*)?$/i.test(text);
}

function openQuery(raw) {
  const value = raw.trim();
  if (!value) return;

  if (looksLikeUrl(value)) {
    const target = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    window.location.assign(target);
    return;
  }

  browser.search.query({ text: value, disposition: "CURRENT_TAB" });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  openQuery(input.value);
});

window.addEventListener("load", () => {
  input.focus({ preventScroll: true });
});

// Height of the browser toolbars above the page. Changes (e.g. toggling the
// bookmarks toolbar) resize the viewport, which fires "resize".
function updateChromeHeight() {
  const chrome = "mozInnerScreenY" in window
    // A maximized window on Windows starts above the screen edge by its
    // invisible resize border (screenY -8), which is not visible chrome.
    ? window.mozInnerScreenY - Math.max(window.screenY, screen.availTop)
    : window.outerHeight - window.innerHeight;
  document.documentElement.style.setProperty("--chrome-height", `${Math.max(0, chrome)}px`);
  // Something (the sidebar) sits between the window edge and the page.
  if ("mozInnerScreenX" in window) {
    document.documentElement.classList.toggle("has-sidebar", window.mozInnerScreenX - Math.max(window.screenX, screen.availLeft) > 16);
  }
}
updateChromeHeight();
window.addEventListener("resize", updateChromeHeight);

// Custom images chosen on the options page.
browser.storage.local.get(["headerImage", "newtabImage", "seamless", "bottomColor", "menuColor", "accentColor"]).then(({ headerImage, newtabImage, seamless, bottomColor, menuColor, accentColor }) => {
  const root = document.documentElement.style;
  const classes = document.documentElement.classList;
  if (newtabImage) classes.add("custom-image");
  if (menuColor) root.setProperty("--frame", menuColor);
  // Same rule as background.js: a light menu color means a light picture.
  if (menuColor) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(menuColor.slice(i, i + 2), 16) / 255);
    classes.toggle("light", .2126 * r + .7152 * g + .0722 * b > .55);
  }
  if (menuColor || accentColor) {
    classes.add("custom-colors");
    root.setProperty("--menu", menuColor || "#090e18");
    root.setProperty("--accent", accentColor || "#63f2ff");
  }
  if (seamless === false) document.querySelector(".header-continuation").hidden = true;
  if (headerImage) root.setProperty("--header-image", `url("${headerImage}")`);
  if (newtabImage) root.setProperty("--newtab-image", `url("${newtabImage}")`);
  if (bottomColor) root.setProperty("--bottom-color", bottomColor);
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let particleTimer;

function edgeStart() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const edge = Math.floor(Math.random() * 3);

  if (edge === 0) return { x: Math.random() * w, y: -24 };
  if (edge === 1) return { x: -24, y: h * (.14 + Math.random() * .58) };
  return { x: w + 24, y: h * (.10 + Math.random() * .62) };
}

function spawnAttractedParticle() {
  if (reducedMotion.matches || document.hidden) return;

  const particle = document.createElement("span");
  particle.className = "attracted-particle";
  const start = edgeStart();
  const target = {
    x: window.innerWidth * .51,
    y: window.innerHeight * .49
  };

  particle.style.left = `${start.x}px`;
  particle.style.top = `${start.y}px`;
  const size = .8 + Math.random() * 1.5;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particleLayer.appendChild(particle);

  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length;
  const py = dx / length;
  const bend = (Math.random() - .5) * Math.min(180, length * .18);
  const duration = 5200 + Math.random() * 4400;

  const animation = particle.animate([
    { transform: "translate(0,0) scale(1)", opacity: 0, offset: 0 },
    { transform: `translate(${dx * .18 + px * bend}px, ${dy * .18 + py * bend}px) scale(1)`, opacity: .72, offset: .18 },
    { transform: `translate(${dx * .58 + px * bend * .55}px, ${dy * .58 + py * bend * .55}px) scale(.78)`, opacity: .88, offset: .58 },
    { transform: `translate(${dx * .90 + px * bend * .12}px, ${dy * .90 + py * bend * .12}px) scale(.42)`, opacity: .58, offset: .90 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0, offset: 1 }
  ], {
    duration,
    easing: "cubic-bezier(.20,.03,.36,1)",
    fill: "forwards"
  });

  animation.finished.finally(() => particle.remove());
}

function startParticles() {
  clearInterval(particleTimer);
  if (reducedMotion.matches) return;
  for (let i = 0; i < 4; i++) setTimeout(spawnAttractedParticle, 500 + i * 760);
  particleTimer = setInterval(spawnAttractedParticle, 1500);
}

reducedMotion.addEventListener?.("change", startParticles);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) startParticles();
});
startParticles();
