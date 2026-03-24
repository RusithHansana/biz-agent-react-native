export const spacing = {
  "space-1": 4,
  "space-2": 8,
  "space-3": 12,
  "space-4": 16,
  "space-6": 24,
  "space-8": 32,
  "space-12": 48,
  "space-16": 64,
} as const;

export type RadiusValue = number | "50%";

export const radii: Record<string, RadiusValue> = {
  bubble: 12,
  bubbleSenderCorner: 4,
  card: 12,
  button: 8,
  input: 8,
  avatar: "50%",
} as const;
