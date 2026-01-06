/**
 * Configuration de la grille
 */
export const GRID_CONFIG = {
  BLOCK_HEIGHT_VH: 20,
  BLOCK_WIDTH_VH: 20,
  BLOCKS_PER_IMAGE: 2,
  FILL_RATIO: 0.55,
  SCALES: [
    { value: 0.75, weight: 0 },
    { value: 0.60, weight: 80 },
    { value: 0.40, weight: 20 },
    { value: 0.25, weight: 0 },
  ],
  DEBUG_GRID: false
}
