import { BeanInput, GrindResult } from "./types.js";
import { ORIGINS, VARIETIES, PROCESSES, ROASTS } from "./data.js";

const STEP_LABELS = [
  "much finer",
  "finer",
  "slightly finer",
  "your usual grind",
  "slightly coarser",
  "coarser",
  "much coarser",
];

interface Factor {
  label: string;
  modifier: number;
}

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

export function computeGrind(input: BeanInput): GrindResult {
  const factors: Factor[] = [];

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
