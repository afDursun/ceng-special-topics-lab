const UPPER = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
const LOWER = "abcçdefgğhıijklmnoöprsştuüvyz";
const N = UPPER.length;

const textEl = document.querySelector("#text");
const keyEl = document.querySelector("#key");
const playBtn = document.querySelector("#play");
const nextBtn = document.querySelector("#next");
const captionEl = document.querySelector("#caption");
const eqFrom = document.querySelector("#eq-from");
const eqKey = document.querySelector("#eq-key");
const eqTo = document.querySelector("#eq-to");
const eqMath = document.querySelector("#eq-math");
const plainEl = document.querySelector("#plain");
const cipherEl = document.querySelector("#cipher");
const trackEl = document.querySelector("#track");

let runId = 0;
let busy = false;
let text = "";
let key = 3;
let index = 0;
let output = "";
let started = false;

const STEP_START = 900;
const STEP_WALK = 550;
const STEP_LAND = 700;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function currentKey() {
  const value = Number.parseInt(keyEl.value, 10);
  if (!Number.isFinite(value) || value === 0) return 3;
  return ((value % N) + N) % N;
}

function lookup(character) {
  if (UPPER.includes(character)) {
    return { alphabet: UPPER, index: UPPER.indexOf(character) };
  }
  if (LOWER.includes(character)) {
    return { alphabet: LOWER, index: LOWER.indexOf(character) };
  }
  return null;
}

function makeTiles(value, target) {
  target.replaceChildren();
  [...value].forEach((character, i) => {
    const tile = document.createElement("span");
    tile.className = "tile";
    tile.dataset.i = String(i);
    tile.textContent = character === " " ? "·" : character;
    target.append(tile);
  });
}

function setTileState(root, i, className) {
  root.querySelectorAll(".tile").forEach((tile) => {
    tile.classList.remove("current", "pop");
  });
  const tile = root.querySelector(`.tile[data-i="${i}"]`);
  if (tile && className) {
    for (const name of className.split(" ")) {
      if (name) tile.classList.add(name);
    }
  }
}

function markDone(root, i) {
  const tile = root.querySelector(`.tile[data-i="${i}"]`);
  if (tile) tile.classList.add("done");
}

function onTrail(from, here, i) {
  if (from < 0 || here < 0) return false;
  let cursor = from;
  for (let step = 0; step < N; step += 1) {
    if (cursor === here) return false;
    if (cursor === i) return true;
    cursor = (cursor + 1) % N;
  }
  return false;
}

function renderTrack(from, here, to) {
  trackEl.replaceChildren();
  [...UPPER].forEach((letter, i) => {
    const cell = document.createElement("span");
    cell.className = "track-cell";
    if (onTrail(from, here, i)) cell.classList.add("trail");
    if (i === from) cell.classList.add("from");
    if (i === here) cell.classList.add("here");
    if (i === to && to !== here) cell.classList.add("to");

    const glyph = document.createElement("b");
    glyph.textContent = letter;
    const idx = document.createElement("small");
    idx.textContent = String(i);
    cell.append(glyph, idx);
    trackEl.append(cell);
  });
  const active = trackEl.querySelector(".here") || trackEl.querySelector(".from");
  if (active) {
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }
}

function setEquation(from, keyValue, to, math) {
  eqFrom.textContent = from;
  eqKey.textContent = keyValue;
  eqTo.textContent = to;
  eqMath.textContent = math;
}

function setControls() {
  nextBtn.disabled = busy || !started || index >= text.length;
  playBtn.disabled = busy;
  playBtn.textContent = started ? "Yeniden" : "Başlat";
}

function resetView() {
  text = textEl.value || "MERHABA";
  key = currentKey() || 3;
  index = 0;
  output = "";
  started = true;
  makeTiles(text, plainEl);
  makeTiles(" ".repeat(text.length), cipherEl);
  cipherEl.querySelectorAll(".tile").forEach((tile) => {
    tile.textContent = "";
  });
  renderTrack(-1, -1, -1);
  setEquation("—", String(key), "—", "indeks + anahtar (mod 29)");
  captionEl.textContent = `Anahtar ${key}. Sonraki ile harfleri tek tek işle.`;
  setControls();
}

async function processCharacter() {
  if (busy || !started || index >= text.length) return;
  busy = true;
  setControls();
  const id = ++runId;
  const cancelled = () => id !== runId;
  const i = index;
  const character = text[i];

  setTileState(plainEl, i, "current");
  const found = lookup(character);

  if (!found) {
    output += character;
    const outTile = cipherEl.querySelector(`.tile[data-i="${i}"]`);
    outTile.textContent = character === " " ? "·" : character;
    outTile.classList.add("done", "pop");
    markDone(plainEl, i);
    setEquation(character, String(key), character, "Alfabede yok, aynı kalır.");
    captionEl.textContent = "Boşluk ve noktalama kaydırılmaz.";
    renderTrack(-1, -1, -1);
    await wait(STEP_LAND);
    if (cancelled()) return;
  } else {
    const to = (found.index + key) % N;
    const result = found.alphabet[to];
    setEquation(
      character,
      String(key),
      result,
      `indeks ${found.index} + ${key} = ${to} (mod ${N})`
    );
    captionEl.textContent = `${character} harfi ${key} adım sağa kayıyor.`;

    for (let step = 0; step <= key; step += 1) {
      if (cancelled()) return;
      const here = (found.index + step) % N;
      renderTrack(found.index, here, to);
      await wait(step === 0 ? STEP_START : STEP_WALK);
    }
    if (cancelled()) return;

    output += result;
    const outTile = cipherEl.querySelector(`.tile[data-i="${i}"]`);
    outTile.textContent = result;
    outTile.classList.add("done", "pop");
    setTileState(plainEl, i, "done");
    markDone(plainEl, i);
    captionEl.textContent = `${character} → ${result}`;
    await wait(STEP_LAND);
    if (cancelled()) return;
  }

  index += 1;
  busy = false;

  if (index >= text.length) {
    setTileState(plainEl, -1, "");
    plainEl.querySelectorAll(".tile").forEach((tile) => tile.classList.add("done"));
    captionEl.textContent = `Bitti: ${text} → ${output}`;
    setEquation("—", String(key), "—", `${text} → ${output}`);
  } else {
    captionEl.textContent = `Hazır. Sonraki karaktere geçmek için Sonraki’ye bas. (${index + 1}/${text.length})`;
  }
  setControls();
}

async function start() {
  runId += 1;
  busy = false;
  resetView();
  await processCharacter();
}

async function next() {
  await processCharacter();
}

playBtn.addEventListener("click", start);
nextBtn.addEventListener("click", next);

textEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    start();
  }
});

makeTiles(textEl.value, plainEl);
makeTiles("", cipherEl);
renderTrack(-1, -1, -1);
setEquation("—", String(currentKey() || 3), "—", "indeks + anahtar (mod 29)");
captionEl.textContent = "Başlat’a bas; sonra Sonraki ile karakter karakter ilerle.";
setControls();
