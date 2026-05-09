export const MULTIPLICANDS = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15] as const;
export const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15] as const;

export type Multiplicand = (typeof MULTIPLICANDS)[number];
export type Multiplier = (typeof MULTIPLIERS)[number];
