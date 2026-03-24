export const MESAS = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
export const BALCAO = Array.from({ length: 4 }, (_, i) => `Balcão ${i + 1}`);
export const ALL_TABLES = [...MESAS, ...BALCAO];
