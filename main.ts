import { ORIGINS, VARIETIES, PROCESSES, ROASTS } from "./data.js";
import { computeGrind } from "./grind-logic.js";
import { scanBagImage } from "./ocr.js";
import { BeanInput } from "./types.js";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

const originSelect = el<HTMLSelectElement>("origin");
const varietySelect = el<HTMLSelectElement>("variety");
const processSelect = el<HTMLSelectElement>("process");
const roastSelect = el<HTMLSelectElement>("roast");
const scanInput = el<HTMLInputElement>("scan-input");
const scanStatus = el<HTMLParagraphElement>("scan-status");
const resultLabel = el<HTMLParagraphElement>("result-label");
const resultReason = el<HTMLParagraphElement>("result-reason");
const marker = el<HTMLDivElement>("gauge-marker");

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]) {
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Not sure";
  select.appendChild(blank);
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    select.appendChild(el);
  }
}

fillSelect(originSelect, ORIGINS.map((o) => ({ value: o.name, label: o.name })));
fillSelect(varietySelect, VARIETIES.map((v) => ({ value: v.name, label: v.name })));
fillSelect(processSelect, PROCESSES.map((p) => ({ value: p.value, label: p.label })));
fillSelect(roastSelect, ROASTS.map((r) => ({ value: r.value, label: r.label })));

function currentInput(): BeanInput {
  return {
    origin: originSelect.value || null,
    variety: varietySelect.value || null,
    process: (processSelect.value || null) as BeanInput["process"],
    roast: (roastSelect.value || null) as BeanInput["roast"],
  };
}

function render() {
  const result = computeGrind(currentInput());
  resultLabel.textContent = result.label;
  resultReason.textContent = result.reason;
  const percent = (result.stepIndex / 6) * 100;
  marker.style.left = `${percent}%`;
}

for (const select of [originSelect, varietySelect, processSelect, roastSelect]) {
  select.addEventListener("change", render);
}

scanInput.addEventListener("change", async () => {
  const file = scanInput.files?.[0];
  if (!file) return;
  scanStatus.textContent = "Reading label…";
  scanStatus.classList.add("visible");
  try {
    const match = await scanBagImage(file, (status) => {
      scanStatus.textContent = status;
    });
    if (match.origin) originSelect.value = match.origin;
    if (match.variety) varietySelect.value = match.variety;
    if (match.process) processSelect.value = match.process;
    const filled = [match.origin, match.variety, match.process].filter(Boolean).length;
    scanStatus.textContent =
      filled > 0
        ? `Filled ${filled} field${filled > 1 ? "s" : ""} from the label. Check them, then set roast level.`
        : "Couldn't match text on the label. Fill the fields in by hand.";
    render();
  } catch (err) {
    scanStatus.textContent = "Scan failed. Fill the fields in by hand.";
  }
});

render();
