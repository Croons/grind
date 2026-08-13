// ---------- Types ----------
interface BeanInput {
  origin: string | null;
  variety: string | null;
  process: string | null;
  altitude: number | null;
  roastValue: number; // 0-100 slider position
}

interface GrindResult {
  stepIndex: number;
  label: string;
  reason: string;
}

// ---------- Data ----------
interface OriginEntry { name: string; modifier: number; aliases?: string[]; }
interface VarietyEntry { name: string; modifier: number; aliases?: string[]; }
interface ProcessEntry { value: string; label: string; modifier: number; aliases?: string[]; }
interface RoastStop { value: number; label: string; modifier: number; }

// Origin modifiers are intentionally smaller than before: altitude is now its
// own field and carries most of the elevation effect. What's left here is the
// rest of a region's typical profile (climate, soil, common processing style).
const ORIGINS: OriginEntry[] = [
  { name: "Ethiopia", modifier: 0.5 },
  { name: "Kenya", modifier: 0.6 },
  { name: "Yemen", modifier: 0.5 },
  { name: "Colombia", modifier: 0.3 },
  { name: "Guatemala", modifier: 0.3 },
  { name: "Costa Rica", modifier: 0.25 },
  { name: "Panama", modifier: 0.35 },
  { name: "Honduras", modifier: 0.15 },
  { name: "El Salvador", modifier: 0.15 },
  { name: "Rwanda", modifier: 0.25 },
  { name: "Burundi", modifier: 0.25 },
  { name: "Peru", modifier: 0.1 },
  { name: "Bolivia", modifier: 0.2 },
  { name: "Brazil", modifier: -0.25 },
  { name: "Indonesia", modifier: -0.3 },
  { name: "Papua New Guinea", modifier: -0.1 },
  { name: "India", modifier: -0.2 },
  { name: "Vietnam", modifier: -0.4 },
];

const VARIETIES: VarietyEntry[] = [
  { name: "Bourbon", modifier: 0.5 },
  { name: "Typica", modifier: 0.4, aliases: ["Tipica"] },
  { name: "SL28", modifier: 0.6, aliases: ["SL 28", "SL-28"] },
  { name: "SL34", modifier: 0.5, aliases: ["SL 34", "SL-34"] },
  { name: "Ruiru 11", modifier: 0.3 },
  { name: "Batian", modifier: 0.3 },
  { name: "Caturra", modifier: 0.3 },
  { name: "Catuai", modifier: 0.1, aliases: ["Catuaí"] },
  { name: "Mundo Novo", modifier: 0.2 },
  { name: "Icatu", modifier: 0.0 },
  { name: "Pacamara", modifier: -0.4 },
  { name: "Maragogipe", modifier: -0.6, aliases: ["Maragogype"] },
  { name: "Geisha / Gesha", modifier: -0.2, aliases: ["Geisha", "Gesha"] },
  { name: "Pacas", modifier: 0.2 },
  { name: "Villa Sarchi", modifier: 0.3, aliases: ["Villa Sarchí"] },
  { name: "Java", modifier: 0.1 },
  { name: "Castillo", modifier: 0.0 },
  { name: "Sidra", modifier: -0.1 },
  { name: "Parainema", modifier: 0.0 },
  { name: "Marsellesa", modifier: 0.1 },
];

// A wide processing list, ordered roughly from densest / most even (finer
// grind) to most broken-down by fermentation or heat (coarser grind).
const PROCESSES: ProcessEntry[] = [
  { value: "washed", label: "Washed", modifier: 0.5 },
  { value: "cold-wash", label: "Cold wash / cold fermentation", modifier: 0.3 },
  { value: "anaerobic-washed", label: "Anaerobic washed", modifier: 0.2 },
  { value: "white-honey", label: "White honey", modifier: 0.3 },
  { value: "yellow-honey", label: "Yellow honey", modifier: 0.0, aliases: ["Honey"] },
  { value: "red-honey", label: "Red honey", modifier: -0.1 },
  { value: "black-honey", label: "Black honey", modifier: -0.3 },
  { value: "thermal-shock", label: "Thermal shock", modifier: -0.4 },
  { value: "mosto", label: "Mosto / cherry must", modifier: -0.5 },
  { value: "anaerobic-fermentation", label: "Anaerobic fermentation", modifier: -0.5 },
  { value: "lactic-fermentation", label: "Lactic fermentation", modifier: -0.6 },
  { value: "carbonic-maceration", label: "Carbonic maceration", modifier: -0.6 },
  { value: "natural", label: "Natural", modifier: -0.6, aliases: ["Dry process"] },
  { value: "extended-fermentation", label: "Extended fermentation", modifier: -0.7 },
  { value: "koji-fermentation", label: "Koji fermentation", modifier: -0.7 },
  { value: "wet-hulled", label: "Wet-hulled", modifier: -0.8, aliases: ["Giling Basah"] },
  { value: "double-fermentation", label: "Double fermentation", modifier: -0.8 },
  { value: "anaerobic-natural", label: "Anaerobic natural", modifier: -0.9 },
  { value: "other", label: "Other / unlisted", modifier: 0.0 },
];

// Roast slider: continuous 0-100, with named stops. The label shown is the
// nearest stop; the modifier used in the calculation is interpolated between
// the two nearest stops so the gauge doesn't jump in steps.
const ROAST_STOPS: RoastStop[] = [
  { value: 0, label: "Ultra-light", modifier: 0.9 },
  { value: 20, label: "Light", modifier: 0.5 },
  { value: 40, label: "Light-medium", modifier: 0.1 },
  { value: 55, label: "Medium", modifier: -0.3 },
  { value: 70, label: "Medium-dark", modifier: -0.7 },
  { value: 85, label: "Dark", modifier: -1.1 },
  { value: 100, label: "Very dark", modifier: -1.5 },
];

function roastLabelAndModifier(value: number): { label: string; modifier: number } {
  let lower = ROAST_STOPS[0];
  let upper = ROAST_STOPS[ROAST_STOPS.length - 1];
  for (let i = 0; i < ROAST_STOPS.length - 1; i++) {
    if (value >= ROAST_STOPS[i].value && value <= ROAST_STOPS[i + 1].value) {
      lower = ROAST_STOPS[i];
      upper = ROAST_STOPS[i + 1];
      break;
    }
  }
  const span = upper.value - lower.value || 1;
  const t = (value - lower.value) / span;
  const modifier = lower.modifier + (upper.modifier - lower.modifier) * t;
  const label = t < 0.5 ? lower.label : upper.label;
  return { label, modifier };
}

// Altitude modifier: centered on a typical specialty lot around 1300 masl.
// Higher altitude means slower cherry maturation and denser seeds.
function altitudeModifier(altitude: number | null): number {
  if (altitude === null || Number.isNaN(altitude)) return 0;
  const raw = ((altitude - 1300) / 500) * 0.55;
  return Math.max(-0.9, Math.min(1.3, raw));
}

// ---------- Fuzzy matching ----------
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function wordsClose(a: string, b: string): boolean {
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return a === b;
  const allowed = maxLen <= 6 ? 1 : 2;
  return levenshtein(a, b) <= allowed;
}

/** Checks whether `name` (or one of its aliases) appears in `text`, allowing
 * for small spelling differences, OCR noise, and accent variants. */
function fuzzyFind(text: string, candidates: string[]): boolean {
  const tokens = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const candidateRaw of candidates) {
    const candidate = candidateRaw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .trim();
    const candidateWords = candidate.split(/\s+/).filter(Boolean);

    if (candidateWords.length === 1) {
      if (tokens.some((t) => wordsClose(t, candidateWords[0]))) return true;
    } else {
      for (let i = 0; i <= tokens.length - candidateWords.length; i++) {
        const slice = tokens.slice(i, i + candidateWords.length);
        if (slice.every((t, idx) => wordsClose(t, candidateWords[idx]))) return true;
      }
    }
  }
  return false;
}

function fuzzyMatchName(text: string, name: string, aliases: string[] = []): boolean {
  return fuzzyFind(text, [name, ...aliases]);
}

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

  const origin = ORIGINS.find((o) => o.name === input.origin);
  if (origin) factors.push({ label: `${origin.name} origin`, modifier: origin.modifier });

  const variety = VARIETIES.find((v) => v.name === input.variety);
  if (variety) factors.push({ label: `${variety.name} variety`, modifier: variety.modifier });

  const process = PROCESSES.find((p) => p.value === input.process);
  if (process) factors.push({ label: `${process.label.toLowerCase()} process`, modifier: process.modifier });

  const altMod = altitudeModifier(input.altitude);
  if (altMod !== 0) {
    factors.push({
      label: input.altitude && input.altitude >= 1300 ? "high altitude" : "lower altitude",
      modifier: altMod,
    });
  }

  const roast = roastLabelAndModifier(input.roastValue);
  factors.push({ label: `${roast.label.toLowerCase()} roast`, modifier: roast.modifier });

  const score = factors.reduce((sum, f) => sum + f.modifier, 0);
  const stepIndex = scoreToStep(score);
  const label = STEP_LABELS[stepIndex];

  const ranked = [...factors].sort((a, b) => Math.abs(b.modifier) - Math.abs(a.modifier));
  const top = ranked.slice(0, 2).filter((f) => Math.abs(f.modifier) > 0.05);
  const reason =
    top.length === 0
      ? "Close to a typical density and porosity profile."
      : top.map((f) => f.label).join(" and ") + (score >= 0 ? " push this denser." : " push this looser.");

  return { stepIndex, label, reason };
}

// ---------- OCR ----------
declare const Tesseract: any;

interface ScanMatch {
  origin: string | null;
  variety: string | null;
  process: string | null;
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

  const origin = ORIGINS.find((o) => fuzzyMatchName(text, o.name, o.aliases))?.name ?? null;
  const variety = VARIETIES.find((v) => fuzzyMatchName(text, v.name, v.aliases))?.name ?? null;
  const process =
    PROCESSES.find((p) => p.value !== "other" && fuzzyMatchName(text, p.label, p.aliases))?.value ?? null;

  return { origin, variety, process };
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
  const altitudeInput = el<HTMLInputElement>("altitude");
  const roastSlider = el<HTMLInputElement>("roast");
  const roastValueLabel = el<HTMLSpanElement>("roast-value-label");
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

  function updateRoastLabel() {
    const { label } = roastLabelAndModifier(Number(roastSlider.value));
    roastValueLabel.textContent = label;
  }

  function currentInput(): BeanInput {
    return {
      origin: originSelect.value || null,
      variety: varietySelect.value || null,
      process: processSelect.value || null,
      altitude: altitudeInput.value ? Number(altitudeInput.value) : null,
      roastValue: Number(roastSlider.value),
    };
  }

  function allFieldsFilled(): boolean {
    const input = currentInput();
    return Boolean(input.origin && input.variety && input.process);
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

  for (const control of [originSelect, varietySelect, processSelect, altitudeInput]) {
    control.addEventListener("change", () => {
      updateCalcButton();
      resultSection.classList.remove("visible");
    });
  }

  roastSlider.addEventListener("input", () => {
    updateRoastLabel();
    resultSection.classList.remove("visible");
  });

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
          ? `Filled ${filled} field${filled > 1 ? "s" : ""} from the label. Check them, then set roast and altitude.`
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

  updateRoastLabel();
  updateCalcButton();
});
