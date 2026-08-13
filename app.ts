// ---------- Types ----------
type Process = "washed" | "natural" | "honey" | "anaerobic-washed" | "anaerobic-natural" | "other";
type RoastLevel = "ultra-light" | "light" | "light-medium";

interface BeanInput {
  origin: string | null;
  variety: string | null;
  process: Process | null;
  roast: RoastLevel | null;
}

interface GrindResult {
  stepIndex: number;
  label: string;
  reason: string;
}

// ---------- Data ----------
interface OriginEntry { name: string; modifier: number; }
interface VarietyEntry { name: string; modifier: number; }
interface ProcessEntry { value: string; label: string; modifier: number; }
interface RoastEntry { value: string; label: string; modifier: number; }

const ORIGINS: OriginEntry[] = [
  { name: "Ethiopia", modifier: 1.0 },
  { name: "Kenya", modifier: 1.2 },
  { name: "Yemen", modifier: 1.0 },
  { name: "Colombia", modifier: 0.6 },
  { name: "Guatemala", modifier: 0.6 },
  { name: "Costa Rica", modifier: 0.5 },
  { name: "Panama", modifier: 0.7 },
  { name: "Honduras", modifier: 0.3 },
  { name: "El Salvador", modifier: 0.3 },
  { name: "Rwanda", modifier: 0.5 },
  { name: "Burundi", modifier: 0.5 },
  { name: "Peru", modifier: 0.2 },
  { name: "Bolivia", modifier: 0.4 },
  { name: "Brazil", modifier: -0.5 },
  { name: "Indonesia", modifier: -0.6 },
  { name: "Papua New Guinea", modifier: -0.2 },
  { name: "India", modifier: -0.4 },
  { name: "Vietnam", modifier: -0.8 },
];

const VARIETIES: VarietyEntry[] = [
  { name: "Bourbon", modifier: 0.5 },
  { name: "Typica", modifier: 0.4 },
  { name: "SL28", modifier: 0.6 },
  { name: "SL34", modifier: 0.5 },
  { name: "Caturra", modifier: 0.3 },
  { name: "Catuai", modifier: 0.1 },
  { name: "Pacamara", modifier: -0.4 },
  { name: "Maragogipe", modifier: -0.6 },
  { name: "Geisha", modifier: -0.2 },
  { name: "Gesha", modifier: -0.2 },
  { name: "Pacas", modifier: 0.2 },
  { name: "Villa Sarchi", modifier: 0.3 },
  { name: "Java", modifier: 0.1 },
  { name: "Castillo", modifier: 0.0 },
  { name: "Sidra", modifier: -0.1 },
];

const PROCESSES: ProcessEntry[] = [
  { value: "washed", label: "Washed", modifier: 0.5 },
  { value: "honey", label: "Honey", modifier: 0.0 },
  { value: "natural", label: "Natural", modifier: -0.6 },
  { value: "anaerobic-washed", label: "Anaerobic washed", modifier: 0.2 },
  { value: "anaerobic-natural", label: "Anaerobic natural", modifier: -0.9 },
  { value: "other", label: "Other / unlisted", modifier: 0.0 },
];

const ROASTS: RoastEntry[] = [
  { value: "ultra-light", label: "Ultra-light", modifier: 0.6 },
  { value: "light", label: "Light", modifier: 0.0 },
  { value: "light-medium", label: "Light-medium", modifier: -0.4 },
];

// ---------- Grind logic ----------
const STEP_LABELS = [
  "much finer",
  "finer",
  "slightly finer",
  "your usual grind",
  "slightly coarser",
  "coarser",
  "much coarser",
];

function findModifier<T extends { modifier: number }>(
  list: T[],
  key: string | null,
  getName: (item: T) => string
): { modifier: number; label: string } | null {
  if (!key) return null;
  const match = list.find((item) => getName(item).toLowerCase() === key.toLowerCase());
  if (!match) return null;
  return { modifier: match.modifier, label: getName(match) };
}

function scoreToStep(score: number): number {
  if (score >= 1.4) return 0;
  if (score >= 0.6) return 1;
  if (score >= 0.2) return 2;
  if (score > -0.2) return 3;
  if (score > -0.6) return 4;
  if (score > -1.4) return 5;
  return 6;
}

function computeGrind(input: BeanInput): GrindResult {
  const factors: { label: string; modifier: number }[] = [];

  const origin = findModifier(ORIGINS, input.origin, (o) => o.name);
  if (origin) factors.push({ label: `${origin.label} origin`, modifier: origin.modifier });

  const variety = findModifier(VARIETIES, input.variety, (v) => v.name);
  if (variety) factors.push({ label: `${variety.label} variety`, modifier: variety.modifier });

  const process = PROCESSES.find((p) => p.value === input.process);
  if (process) factors.push({ label: `${process.label.toLowerCase()} process`, modifier: process.modifier });

  const roast = ROASTS.find((r) => r.value === input.roast);
  if (roast) factors.push({ label: `${roast.label.toLowerCase()} roast`, modifier: roast.modifier });

  const score = factors.reduce((sum, f) => sum + f.modifier, 0);
  const stepIndex = scoreToStep(score);
  const label = STEP_LABELS[stepIndex];

  let reason = "Fill in a few fields to see a suggestion.";
  if (factors.length > 0) {
    const ranked = [...factors].sort((a, b) => Math.abs(b.modifier) - Math.abs(a.modifier));
    const top = ranked.slice(0, 2).filter((f) => Math.abs(f.modifier) > 0.05);
    if (top.length === 0) {
      reason = "Close to a typical density and porosity profile.";
    } else {
      reason = top.map((f) => f.label).join(" and ") + (score >= 0 ? " push this denser." : " push this looser.");
    }
  }

  return { stepIndex, label, reason };
}

// ---------- OCR ----------
declare const Tesseract: any;

interface ScanMatch {
  origin: string | null;
  variety: string | null;
  process: string | null;
}

function findNameInText(text: string, names: string[]): string | null {
  const lower = text.toLowerCase();
  for (const name of names) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return null;
}

async function scanBagImage(file: File, onProgress: (status: string) => void): Promise<ScanMatch> {
  if (typeof Tesseract === "undefined") {
    throw new Error("OCR engine did not load. Check your connection and try again.");
  }
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status) onProgress(m.status);
    },
  });
  const text: string = result?.data?.text ?? "";
  const origin = findNameInText(text, ORIGINS.map((o) => o.name));
  const variety = findNameInText(text, VARIETIES.map((v) => v.name));
  const processLabel = findNameInText(text, PROCESSES.filter((p) => p.value !== "other").map((p) => p.label));
  return {
    origin,
    variety,
    process: processLabel ? processLabel.toLowerCase().replace(/\s+/g, "-") : null,
  };
}

// ---------- DOM wiring ----------
function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]) {
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Not sure";
  select.appendChild(blank);
  for (const opt of options) {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    select.appendChild(optionEl);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const originSelect = el<HTMLSelectElement>("origin");
  const varietySelect = el<HTMLSelectElement>("variety");
  const processSelect = el<HTMLSelectElement>("process");
  const roastSelect = el<HTMLSelectElement>("roast");
  const scanInput = el<HTMLInputElement>("scan-input");
  const scanButton = el<HTMLLabelElement>("scan-button");
  const scanSpinner = el<HTMLDivElement>("scan-spinner");
  const scanStatus = el<HTMLParagraphElement>("scan-status");
  const calcButton = el<HTMLButtonElement>("calc-button");
  const resultSection = el<HTMLElement>("result");
  const resultLabel = el<HTMLParagraphElement>("result-label");
  const resultReason = el<HTMLParagraphElement>("result-reason");
  const marker = el<HTMLDivElement>("gauge-marker");

  fillSelect(originSelect, ORIGINS.map((o) => ({ value: o.name, label: o.name })));
  fillSelect(varietySelect, VARIETIES.map((v) => ({ value: v.name, label: v.name })));
  fillSelect(processSelect, PROCESSES.map((p) => ({ value: p.value, label: p.label })));
  fillSelect(roastSelect, ROASTS.map((r) => ({ value: r.value, label: r.label })));

  function currentInput(): BeanInput {
    return {
      origin: originSelect.value || null,
      variety: varietySelect.value || null,
      process: (processSelect.value || null) as Process | null,
      roast: (roastSelect.value || null) as RoastLevel | null,
    };
  }

  function allFieldsFilled(): boolean {
    const input = currentInput();
    return Boolean(input.origin && input.variety && input.process && input.roast);
  }

  function updateCalcButton() {
    calcButton.disabled = !allFieldsFilled();
  }

  function render() {
    const result = computeGrind(currentInput());
    resultLabel.textContent = result.label;
    resultReason.textContent = result.reason;
    marker.style.left = `${(result.stepIndex / 6) * 100}%`;
    resultSection.classList.add("visible");
  }

  for (const select of [originSelect, varietySelect, processSelect, roastSelect]) {
    select.addEventListener("change", () => {
      updateCalcButton();
      resultSection.classList.remove("visible");
    });
  }

  calcButton.addEventListener("click", () => {
    if (!allFieldsFilled()) return;
    render();
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  scanInput.addEventListener("change", async () => {
    const file = scanInput.files?.[0];
    if (!file) return;

    scanButton.setAttribute("aria-disabled", "true");
    scanSpinner.classList.add("visible");
    scanStatus.textContent = "Reading label…";
    scanStatus.classList.add("visible");

    try {
      const match = await scanBagImage(file, (status) => {
        scanStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1) + "…";
      });
      if (match.origin) originSelect.value = match.origin;
      if (match.variety) varietySelect.value = match.variety;
      if (match.process) processSelect.value = match.process;

      const filled = [match.origin, match.variety, match.process].filter(Boolean).length;
      scanStatus.textContent =
        filled > 0
          ? `Filled ${filled} field${filled > 1 ? "s" : ""} from the label. Check them, then set roast level and calculate.`
          : "Couldn't match text on the label. Fill the fields in by hand.";
      updateCalcButton();
    } catch (err) {
      scanStatus.textContent = err instanceof Error ? err.message : "Scan failed. Fill the fields in by hand.";
    } finally {
      scanButton.removeAttribute("aria-disabled");
      scanSpinner.classList.remove("visible");
      scanInput.value = "";
    }
  });

  updateCalcButton();
});
