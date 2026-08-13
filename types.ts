export type Process = "washed" | "natural" | "honey" | "anaerobic-washed" | "anaerobic-natural" | "other";
export type RoastLevel = "ultra-light" | "light" | "light-medium";

export interface BeanInput {
  origin: string | null;
  variety: string | null;
  process: Process | null;
  roast: RoastLevel | null;
}

export interface GrindResult {
  stepIndex: number; // 0 = much finer .. 6 = much coarser, 3 = usual
  label: string;
  reason: string;
}
