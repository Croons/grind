// Modifiers are on a rough -1.5 (push coarser) to +1.5 (push finer) scale.
// They approximate bean density and porosity, the two traits that most affect
// how fast water moves through the grounds.

export interface OriginEntry {
  name: string;
  modifier: number;
}

export interface VarietyEntry {
  name: string;
  modifier: number;
}

export interface ProcessEntry {
  value: string;
  label: string;
  modifier: number;
}

export interface RoastEntry {
  value: string;
  label: string;
  modifier: number;
}

// Altitude is the main proxy here: higher average growing altitude means
// slower cherry maturation and denser seeds, which need a finer grind.
export const ORIGINS: OriginEntry[] = [
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

// Density category by variety. Unknown varieties default to 0 in the logic.
export const VARIETIES: VarietyEntry[] = [
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

// Process changes cell structure the most. Washed beans are the densest and
// most even, so they set the neutral point. Fermentation-heavy processes
// break the bean down and extract faster, so they push toward coarser.
export const PROCESSES: ProcessEntry[] = [
  { value: "washed", label: "Washed", modifier: 0.5 },
  { value: "honey", label: "Honey", modifier: 0.0 },
  { value: "natural", label: "Natural", modifier: -0.6 },
  { value: "anaerobic-washed", label: "Anaerobic washed", modifier: 0.2 },
  { value: "anaerobic-natural", label: "Anaerobic natural", modifier: -0.9 },
  { value: "other", label: "Other / unlisted", modifier: 0.0 },
];

// Lighter roasts are denser and less porous than darker ones, so within the
// light-roast band, the lightest roasts still need a small finer push.
export const ROASTS: RoastEntry[] = [
  { value: "ultra-light", label: "Ultra-light", modifier: 0.6 },
  { value: "light", label: "Light", modifier: 0.0 },
  { value: "light-medium", label: "Light-medium", modifier: -0.4 },
];
