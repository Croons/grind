// ---------- Types ----------
interface BeanInput {
  origin: string | null;
  variety: string | null;
  process: string | null;
  altitude: number | null;
  roastValue: number; // 0-100 slider position
  restWeeks: number; // 0-53, where 53 means "52+ weeks"
}

interface GrindResult {
  stepIndex: number;
  label: string;
  reason: string;
}

// ---------- Data ----------
interface OriginEntry { name: string; modifier: number; aliases?: string[]; }
interface VarietyEntry { name: string; modifier: number; aliases?: string[]; largeBean?: boolean; }
interface ProcessEntry { value: string; label: string; modifier: number; aliases?: string[]; }
interface RoastStop { value: number; label: string; modifier: number; }

// Origin modifiers are deliberately small: altitude is its own field and
// carries most of the elevation effect. What's left here is the rest of a
// region's typical profile (climate, soil, common processing culture).
// Research note: green-bean mass density varies little across specialty
// origins (Gagné 2019); surface hardness varies more but is only loosely
// tied to origin, so this stays a light nudge, not a strong signal.
const ORIGINS: OriginEntry[] = [
  { name: "Ethiopia", modifier: 0.3 },
  { name: "Kenya", modifier: 0.4 },
  { name: "Yemen", modifier: 0.3 },
  { name: "Colombia", modifier: 0.2 },
  { name: "Guatemala", modifier: 0.2 },
  { name: "Costa Rica", modifier: 0.15 },
  { name: "Panama", modifier: 0.2 },
  { name: "Honduras", modifier: 0.1 },
  { name: "El Salvador", modifier: 0.1 },
  { name: "Rwanda", modifier: 0.15 },
  { name: "Burundi", modifier: 0.15 },
  { name: "Peru", modifier: 0.05 },
  { name: "Bolivia", modifier: 0.1 },
  { name: "Brazil", modifier: -0.2 },
  { name: "Indonesia", modifier: -0.25 },
  { name: "Papua New Guinea", modifier: -0.05 },
  { name: "India", modifier: -0.1 },
  { name: "Vietnam", modifier: -0.3 },
];

// Variety has the weakest evidence base of any input: there's no published
// per-variety density table, so these are small nudges based mostly on bean
// size (World Coffee Research catalog). The one strong, citable effect is
// giant-bean varieties behaving very differently in a grinder, handled below
// with a separate large-bean flag rather than folded into the base modifier.
const VARIETIES: VarietyEntry[] = [
  { name: "Bourbon", modifier: 0.3 },
  { name: "Typica", modifier: 0.25, aliases: ["Tipica"] },
  { name: "SL28", modifier: 0.35, aliases: ["SL 28", "SL-28"], largeBean: true },
  { name: "SL34", modifier: 0.3, aliases: ["SL 34", "SL-34"] },
  { name: "Ruiru 11", modifier: 0.2 },
  { name: "Batian", modifier: 0.2 },
  { name: "Caturra", modifier: 0.2 },
  { name: "Catuai", modifier: 0.05, aliases: ["Catuaí"] },
  { name: "Mundo Novo", modifier: 0.1 },
  { name: "Icatu", modifier: 0.0 },
  { name: "Pacamara", modifier: -0.2, largeBean: true },
  { name: "Maragogipe", modifier: -0.3, aliases: ["Maragogype"], largeBean: true },
  { name: "Geisha / Gesha", modifier: -0.1, aliases: ["Geisha", "Gesha"] },
  { name: "Pacas", modifier: 0.1 },
  { name: "Villa Sarchi", modifier: 0.2, aliases: ["Villa Sarchí"] },
  { name: "Java", modifier: 0.05, largeBean: true },
  { name: "Castillo", modifier: 0.0 },
  { name: "Sidra", modifier: -0.05 },
  { name: "Parainema", modifier: 0.0 },
  { name: "Marsellesa", modifier: 0.05 },
];

// Processing is one of the most reliable levers here: fermentation and fruit
// contact make beans more soluble and porous, so they extract faster and
// want a coarser grind. Washed is the reference point (Clive Coffee, Perfect
// Daily Grind); honey scales with retained mucilage; anaerobic/fermented
// lots go coarsest, in line with Perfect Daily Grind and The Coffee Compass.
const PROCESSES: ProcessEntry[] = [
  { value: "washed", label: "Washed", modifier: 0.3 },
  { value: "cold-wash", label: "Cold wash / cold fermentation", modifier: 0.2 },
  { value: "anaerobic-washed", label: "Anaerobic washed", modifier: 0.1 },
  { value: "white-honey", label: "White honey", modifier: 0.0 },
  { value: "yellow-honey", label: "Yellow honey", modifier: -0.15, aliases: ["Honey"] },
  { value: "red-honey", label: "Red honey", modifier: -0.3 },
  { value: "black-honey", label: "Black honey", modifier: -0.45 },
  { value: "thermal-shock", label: "Thermal shock", modifier: -0.5 },
  { value: "mosto", label: "Mosto / cherry must", modifier: -0.6 },
  { value: "natural", label: "Natural", modifier: -0.65, aliases: ["Dry process"] },
  { value: "anaerobic-fermentation", label: "Anaerobic fermentation", modifier: -0.7 },
  { value: "lactic-fermentation", label: "Lactic fermentation", modifier: -0.75 },
  { value: "carbonic-maceration", label: "Carbonic maceration", modifier: -0.75 },
  { value: "extended-fermentation", label: "Extended fermentation", modifier: -0.85 },
  { value: "koji-fermentation", label: "Koji fermentation", modifier: -0.85 },
  { value: "wet-hulled", label: "Wet-hulled", modifier: -0.9, aliases: ["Giling Basah"] },
  { value: "double-fermentation", label: "Double fermentation", modifier: -0.95 },
  { value: "anaerobic-natural", label: "Anaerobic natural", modifier: -1.0 },
  { value: "other", label: "Other / unlisted", modifier: 0.0 },
];

// Roast slider: continuous 0-100, with named stops. The label shown is the
// nearest stop; the modifier used in the calculation is interpolated between
// the two nearest stops so the gauge doesn't jump in steps. Roast carries the
// widest modifier range of any input here: it's the single strongest,
// best-documented driver of grind (Counter Culture; BIO Web of Conferences
// 2023 roasting study on density and porosity vs. roast level).
const ROAST_STOPS: RoastStop[] = [
  { value: 0, label: "Ultra-light", modifier: 1.3 },
  { value: 20, label: "Light", modifier: 0.7 },
  { value: 40, label: "Light-medium", modifier: 0.2 },
  { value: 55, label: "Medium", modifier: -0.3 },
  { value: 70, label: "Medium-dark", modifier: -0.9 },
  { value: 85, label: "Dark", modifier: -1.5 },
  { value: 100, label: "Very dark", modifier: -2.0 },
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

// Resting/degassing. Darker roasts are more porous and degas faster but hold
// more total CO2; lighter roasts hold less but degas far more slowly. Most
// of that gap sits at the ultra-light end: some ultra-light lots are still
// developing 2-4-6 months out, well past the ~3 week window that applies to
// a regular light roast. This isn't a straight line, it bends hard once you
// get past "light," so it's modeled as stops rather than one formula.
const REST_PEAK_STOPS: { value: number; days: number }[] = [
  { value: 0, days: 120 },
  { value: 10, days: 60 },
  { value: 20, days: 21 },
  { value: 40, days: 12 },
  { value: 55, days: 8 },
  { value: 70, days: 5 },
  { value: 85, days: 3 },
  { value: 100, days: 2 },
];

function restPeakDays(roastValue: number): number {
  let lower = REST_PEAK_STOPS[0];
  let upper = REST_PEAK_STOPS[REST_PEAK_STOPS.length - 1];
  for (let i = 0; i < REST_PEAK_STOPS.length - 1; i++) {
    if (roastValue >= REST_PEAK_STOPS[i].value && roastValue <= REST_PEAK_STOPS[i + 1].value) {
      lower = REST_PEAK_STOPS[i];
      upper = REST_PEAK_STOPS[i + 1];
      break;
    }
  }
  const span = upper.value - lower.value || 1;
  const t = (roastValue - lower.value) / span;
  return lower.days + (upper.days - lower.days) * t;
}

// Before peak: the coffee is still gassy, CO2 back-pressure causes channeling,
// so a coarser grind helps water move through evenly (Scott Rao; Nordic Brew
// Lab). After peak: as degassing continues, extraction runs faster, so grind
// progressively finer, capped since the effect flattens out over months
// (Barista Hustle; SCA Coffee Freshness Handbook).
function restModifier(restWeeks: number, roastValue: number): number {
  const restDays = restWeeks * 7;
  const peakDays = restPeakDays(roastValue);
  if (restDays < peakDays) {
    const fraction = peakDays > 0 ? restDays / peakDays : 1;
    return -0.5 * (1 - fraction);
  }
  const daysPastPeak = restDays - peakDays;
  return Math.min(1.0, 0.25 * (daysPastPeak / 14));
}

function restLabel(restWeeks: number, roastValue: number): string {
  const weeksText = restWeeks >= 52 ? "52+ weeks" : restWeeks === 1 ? "1 week" : `${restWeeks} weeks`;
  const restDays = restWeeks * 7;
  const peakDays = restPeakDays(roastValue);
  let status: string;
  if (restDays < peakDays * 0.5) status = "very fresh";
  else if (restDays < peakDays) status = "still degassing";
  else if (restDays < peakDays * 3) status = "well rested";
  else status = "long rested";
  return `${weeksText} — ${status}`;
}
// Central America and Gagné's (2019) finding that hardness — not mass
// density — is what actually shifts with elevation. Kept to a max of about
// one grind step in either direction, since the effect is real but modest.
function altitudeModifier(altitude: number | null): number {
  if (altitude === null || Number.isNaN(altitude)) return 0;
  if (altitude < 800) return -0.6;
  if (altitude < 1200) return -0.3;
  if (altitude < 1500) return 0.0;
  if (altitude < 1800) return 0.3;
  if (altitude < 2100) return 0.6;
  return 0.9;
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
  if (variety) {
    factors.push({ label: `${variety.name} variety`, modifier: variety.modifier });
    if (variety.largeBean) {
      factors.push({ label: "very large bean size", modifier: -0.3 });
    }
  }

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

  const restMod = restModifier(input.restWeeks, input.roastValue);
  if (Math.abs(restMod) > 0.02) {
    factors.push({ label: restMod < 0 ? "still degassing" : "extra rest time", modifier: restMod });
  }

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
  const restSlider = el<HTMLInputElement>("rest");
  const restValueLabel = el<HTMLSpanElement>("rest-value-label");
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

  function updateRestLabel() {
    restValueLabel.textContent = restLabel(Number(restSlider.value), Number(roastSlider.value));
  }

  function currentInput(): BeanInput {
    return {
      origin: originSelect.value || null,
      variety: varietySelect.value || null,
      process: processSelect.value || null,
      altitude: altitudeInput.value ? Number(altitudeInput.value) : null,
      roastValue: Number(roastSlider.value),
      restWeeks: Number(restSlider.value),
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
    updateRestLabel();
    resultSection.classList.remove("visible");
  });

  restSlider.addEventListener("input", () => {
    updateRestLabel();
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
  updateRestLabel();
  updateCalcButton();
});
