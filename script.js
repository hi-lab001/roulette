const STORAGE_KEY = "roulette-state-v2";
const LEGACY_STORAGE_KEY = "roulette-options-v1";
const DEFAULT_OPTIONS = ["焼肉", "寿司", "ラーメン", "カレー"].map((label) => ({
  label,
  weights: [1, 1],
}));
const TAU = Math.PI * 2;
const PASTEL_COLORS = [
  "#ffadc9",
  "#b9dcff",
  "#c9baff",
  "#afe7d5",
  "#ffe3a4",
  "#ffc8b2",
  "#b9e7ef",
  "#e9b9db",
  "#c8e6b2",
  "#ffd3e5",
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const optionForm = document.getElementById("optionForm");
const optionInput = document.getElementById("optionInput");
const optionList = document.getElementById("optionList");
const statusText = document.getElementById("statusText");
const resetButton = document.getElementById("resetButton");
const resultDialog = document.getElementById("resultDialog");
const resultText = document.getElementById("resultText");
const closeDialogButton = document.getElementById("closeDialogButton");
const spinAgainButton = document.getElementById("spinAgainButton");
const probabilityDialog = document.getElementById("probabilityDialog");
const probabilityForm = document.getElementById("probabilityForm");
const probabilityRows = document.getElementById("probabilityRows");
const probabilityError = document.getElementById("probabilityError");
const closeProbabilityButton = document.getElementById("closeProbabilityButton");
const cancelProbabilityButton = document.getElementById("cancelProbabilityButton");
const patternToggleHotspot = document.getElementById("patternToggleHotspot");
const probabilityHotspot = document.getElementById("probabilityHotspot");
const toast = document.getElementById("toast");

let state = loadState();
let rotation = 0;
let isSpinning = false;
let toastTimer = null;

function cloneDefaultOptions() {
  return DEFAULT_OPTIONS.map((option) => ({
    label: option.label,
    weights: [...option.weights],
  }));
}

function sanitizeWeight(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeOption(option) {
  if (typeof option === "string") {
    return { label: option, weights: [1, 1] };
  }

  if (!option || typeof option.label !== "string") {
    return null;
  }

  const weights = Array.isArray(option.weights) ? option.weights : [1, 1];
  return {
    label: option.label,
    weights: [sanitizeWeight(weights[0]), sanitizeWeight(weights[1])],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.options)) {
      const normalizedOptions = saved.options.map(normalizeOption).filter(Boolean);
      return {
        options: normalizedOptions.length ? normalizedOptions : cloneDefaultOptions(),
        activePattern: saved.activePattern === 1 ? 1 : 0,
      };
    }
  } catch (error) {
    console.warn("保存済み設定を読み込めませんでした。", error);
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy) && legacy.every((item) => typeof item === "string")) {
      return {
        options: legacy.map((label) => ({ label, weights: [1, 1] })),
        activePattern: 0,
      };
    }
  } catch (error) {
    console.warn("旧バージョンの候補を読み込めませんでした。", error);
  }

  return {
    options: cloneDefaultOptions(),
    activePattern: 0,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function optionColor(index) {
  return PASTEL_COLORS[index % PASTEL_COLORS.length];
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function fitText(text, maxWidth, initialSize) {
  let size = initialSize;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px system-ui, sans-serif`;
  }
  return size;
}

function drawWheel() {
  const { options } = state;
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 22;

  ctx.clearRect(0, 0, width, height);

  if (options.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fillStyle = "#f7eff9";
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.fillStyle = "#9b8ba9";
    ctx.font = "800 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("候補を追加してください", cx, cy);
    return;
  }

  // 表示上の角度は確率に関係なく常に均等にする。
  const slice = TAU / options.length;
  const baseStart = -Math.PI / 2;

  options.forEach((option, index) => {
    const start = baseStart + index * slice + rotation;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = optionColor(index);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.stroke();

    const middle = start + slice / 2;
    const textRadius = radius * 0.65;
    const tx = cx + Math.cos(middle) * textRadius;
    const ty = cy + Math.sin(middle) * textRadius;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(middle + Math.PI / 2);

    const normalizedMiddle = normalizeAngle(middle);
    if (normalizedMiddle > 0 && normalizedMiddle < Math.PI) {
      ctx.rotate(Math.PI);
    }

    const maxTextWidth = Math.max(74, radius * 0.56);
    const fontSize = fitText(option.label, maxTextWidth, Math.min(34, 245 / options.length + 18));
    ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = "#5f526f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,255,255,0.72)";
    ctx.shadowBlur = 6;
    ctx.fillText(option.label, 0, 0, maxTextWidth);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function renderOptions() {
  const { options } = state;
  optionList.innerHTML = "";

  options.forEach((option, index) => {
    const item = document.createElement("li");
    item.className = "option-item";

    const color = document.createElement("span");
    color.className = "option-color";
    color.style.background = optionColor(index);

    const text = document.createElement("span");
    text.className = "option-label";
    text.textContent = option.label;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "削除";
    remove.setAttribute("aria-label", `${option.label}を削除`);
    remove.addEventListener("click", () => removeOption(index));

    item.append(color, text, remove);
    optionList.appendChild(item);
  });

  spinButton.disabled = options.length < 2 || isSpinning;
  statusText.textContent =
    options.length < 2 ? "候補を2つ以上登録してください。" : `${options.length}個の候補から抽選します。`;

  drawWheel();
}

function addOption(value) {
  const label = value.trim();
  if (!label) return;

  state.options.push({ label, weights: [1, 1] });
  saveState();
  renderOptions();
}

function removeOption(index) {
  if (isSpinning) return;
  state.options.splice(index, 1);
  saveState();
  rotation = normalizeAngle(rotation);
  renderOptions();
}

function resetOptions() {
  if (isSpinning) return;
  state = {
    options: cloneDefaultOptions(),
    activePattern: 0,
  };
  rotation = 0;
  saveState();
  renderOptions();
  showToast("初期状態に戻しました");
}

function getPatternWeights(patternIndex = state.activePattern) {
  return state.options.map((option) => sanitizeWeight(option.weights[patternIndex], 0));
}

function getPercentages(patternIndex, weightOverride = null) {
  const weights = weightOverride ?? getPatternWeights(patternIndex);
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return weights.map(() => 0);
  }

  return weights.map((weight) => (weight / total) * 100);
}

function pickWeightedIndex(patternIndex) {
  const weights = getPatternWeights(patternIndex);
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  // 万一全て0なら均等抽選にフォールバックする。
  if (total <= 0) {
    return Math.floor(Math.random() * state.options.length);
  }

  let random = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    random -= weights[index];
    if (random < 0) return index;
  }

  return weights.length - 1;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function spin() {
  const { options } = state;
  if (isSpinning || options.length < 2) return;

  isSpinning = true;
  spinButton.disabled = true;
  statusText.textContent = "抽選中…";

  // 当選確率だけ重み付き。円盤の表示角度は均等のまま。
  const targetIndex = pickWeightedIndex(state.activePattern);
  const slice = TAU / options.length;
  const desiredNormalized = normalizeAngle(-(targetIndex + 0.5) * slice);
  const currentNormalized = normalizeAngle(rotation);
  const extraTurns = 6 + Math.floor(Math.random() * 3);
  const deltaToTarget = normalizeAngle(desiredNormalized - currentNormalized);
  const startRotation = rotation;
  const endRotation = startRotation + extraTurns * TAU + deltaToTarget;
  const duration = 3900;
  const startedAt = performance.now();

  function animate(now) {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutQuint(progress);

    rotation = startRotation + (endRotation - startRotation) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    rotation = normalizeAngle(endRotation);
    isSpinning = false;
    spinButton.disabled = false;
    statusText.textContent = `結果：${options[targetIndex].label}`;
    resultText.textContent = options[targetIndex].label;
    resultDialog.showModal();
  }

  requestAnimationFrame(animate);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1250);
}

function togglePattern() {
  if (isSpinning) return;
  state.activePattern = state.activePattern === 0 ? 1 : 0;
  saveState();
}

function createProbabilityField(optionIndex, patternIndex, value, percentage) {
  const wrapper = document.createElement("label");
  wrapper.className = "probability-field";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.1";
  input.inputMode = "decimal";
  input.className = "probability-input";
  input.value = String(value);
  input.dataset.optionIndex = String(optionIndex);
  input.dataset.patternIndex = String(patternIndex);
  input.setAttribute("aria-label", `${state.options[optionIndex].label} Pattern ${patternIndex === 0 ? "A" : "B"} の重み`);

  const percent = document.createElement("span");
  percent.className = "probability-percent";
  percent.textContent = `${percentage.toFixed(1)}%`;
  percent.dataset.percentOptionIndex = String(optionIndex);
  percent.dataset.percentPatternIndex = String(patternIndex);

  wrapper.append(input, percent);
  return wrapper;
}

function renderProbabilityRows() {
  probabilityRows.innerHTML = "";
  probabilityError.textContent = "";

  const percentagesA = getPercentages(0);
  const percentagesB = getPercentages(1);

  state.options.forEach((option, index) => {
    const row = document.createElement("div");
    row.className = "probability-row";

    const name = document.createElement("span");
    name.className = "probability-option-name";
    name.textContent = option.label;

    const fieldA = createProbabilityField(index, 0, option.weights[0], percentagesA[index]);
    const fieldB = createProbabilityField(index, 1, option.weights[1], percentagesB[index]);

    row.append(name, fieldA, fieldB);
    probabilityRows.appendChild(row);
  });

  probabilityRows.querySelectorAll(".probability-input").forEach((input) => {
    input.addEventListener("input", updateProbabilityPreview);
  });
}

function readDraftWeights() {
  const draft = state.options.map((option) => [...option.weights]);

  probabilityRows.querySelectorAll(".probability-input").forEach((input) => {
    const optionIndex = Number(input.dataset.optionIndex);
    const patternIndex = Number(input.dataset.patternIndex);
    draft[optionIndex][patternIndex] = sanitizeWeight(input.value, 0);
  });

  return draft;
}

function updateProbabilityPreview() {
  const draft = readDraftWeights();

  [0, 1].forEach((patternIndex) => {
    const weights = draft.map((pair) => pair[patternIndex]);
    const percentages = getPercentages(patternIndex, weights);

    percentages.forEach((percentage, optionIndex) => {
      const target = probabilityRows.querySelector(
        `[data-percent-option-index="${optionIndex}"][data-percent-pattern-index="${patternIndex}"]`
      );
      if (target) target.textContent = `${percentage.toFixed(1)}%`;
    });
  });
}

function openProbabilitySettings() {
  if (isSpinning) return;
  renderProbabilityRows();
  probabilityDialog.showModal();
}

function closeProbabilitySettings() {
  probabilityError.textContent = "";
  probabilityDialog.close();
}

function saveProbabilitySettings() {
  const draft = readDraftWeights();
  const totalA = draft.reduce((sum, pair) => sum + pair[0], 0);
  const totalB = draft.reduce((sum, pair) => sum + pair[1], 0);

  if (totalA <= 0 || totalB <= 0) {
    probabilityError.textContent = "Pattern A / B は、それぞれ少なくとも1つの候補を0より大きくしてください。";
    return false;
  }

  state.options = state.options.map((option, index) => ({
    ...option,
    weights: draft[index],
  }));
  saveState();
  probabilityError.textContent = "";
  probabilityDialog.close();
  showToast("確率設定を保存しました");
  return true;
}

optionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addOption(optionInput.value);
  optionInput.value = "";
  optionInput.focus();
});

spinButton.addEventListener("click", spin);
spinAgainButton.addEventListener("click", () => {
  resultDialog.close();
  spin();
});
closeDialogButton.addEventListener("click", () => resultDialog.close());
resetButton.addEventListener("click", resetOptions);

patternToggleHotspot.addEventListener("click", togglePattern);
probabilityHotspot.addEventListener("click", openProbabilitySettings);
closeProbabilityButton.addEventListener("click", closeProbabilitySettings);
cancelProbabilityButton.addEventListener("click", closeProbabilitySettings);

probabilityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveProbabilitySettings();
});

resultDialog.addEventListener("click", (event) => {
  if (event.target === resultDialog) resultDialog.close();
});

probabilityDialog.addEventListener("click", (event) => {
  if (event.target === probabilityDialog) closeProbabilitySettings();
});

renderOptions();
