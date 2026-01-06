/**
 * Générateur de grille irrégulière
 */
import { GRID_CONFIG } from '@/config/grid'
import type { GridImage } from '@/lib/data'

export { GRID_CONFIG }

function createNoise(seed = Math.random() * 10000) {
  return (x: number, y: number) => {
    const n1 = Math.sin(x * 0.7 + seed) * Math.cos(y * 0.9 + seed * 0.7)
    const n2 = Math.sin(x * 1.3 + y * 0.8 + seed * 1.2) * 0.5
    const n3 = Math.cos(x * 0.4 - y * 1.1 + seed * 0.3) * 0.3
    return n1 + n2 + n3
  }
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pickScale(scales = GRID_CONFIG.SCALES): number {
  const totalWeight = scales.reduce((sum, s) => sum + s.weight, 0)
  let random = Math.random() * totalWeight
  for (const scale of scales) {
    random -= scale.weight
    if (random <= 0) return scale.value
  }
  return scales[0].value
}

export function calculateGridSize(imageCount: number, fillRatio = GRID_CONFIG.FILL_RATIO) {
  if (imageCount === 0) return { L: 2, H: 2 }

  const l = GRID_CONFIG.BLOCKS_PER_IMAGE
  const cellsPerImage = l * l
  const totalCellsNeeded = Math.ceil(imageCount * cellsPerImage / fillRatio)

  const sqrt = Math.sqrt(totalCellsNeeded)
  const base = Math.floor(sqrt)
  const candidates = [base - 1, base, base + 1, base + 2].filter(x => x > 0)

  let best = { area: Infinity, L: 0, H: 0 }
  for (const col of candidates) {
    const row = Math.ceil(totalCellsNeeded / col)
    const area = col * row
    if (area >= totalCellsNeeded && area < best.area) {
      best = { area, L: col, H: row }
    }
  }

  return { L: best.L + 1, H: best.H + 1 }
}

function createOccupiedSet() {
  return new Set<string>()
}

function cellKey(x: number, y: number) {
  return `${x},${y}`
}

function markCellsOccupied(occupied: Set<string>, x: number, y: number, l: number) {
  for (let dy = 0; dy < l; dy++) {
    for (let dx = 0; dx < l; dx++) {
      occupied.add(cellKey(x + dx, y + dy))
    }
  }
}

function areCellsFree(occupied: Set<string>, x: number, y: number, l: number) {
  for (let dy = 0; dy < l; dy++) {
    for (let dx = 0; dx < l; dx++) {
      if (occupied.has(cellKey(x + dx, y + dy))) {
        return false
      }
    }
  }
  return true
}

function isForbiddenByMaleFemale(forbidden: Set<string>, x: number, y: number, l: number) {
  for (let dy = 0; dy < l; dy++) {
    for (let dx = 0; dx < l; dx++) {
      if (forbidden.has(cellKey(x + dx, y + dy))) {
        return true
      }
    }
  }
  return false
}

function applyMaleFemaleConstraint(forbidden: Set<string>, x: number, y: number, l: number, L: number, H: number) {
  for (let dy = 0; dy < l; dy++) {
    for (let dx = 0; dx < l; dx++) {
      const cx = x + dx
      const cy = y + dy

      if (cy === 0) forbidden.add(cellKey(cx, H - 1))
      if (cy === H - 1) forbidden.add(cellKey(cx, 0))
      if (cx === 0) forbidden.add(cellKey(L - 1, cy))
      if (cx === L - 1) forbidden.add(cellKey(0, cy))
    }
  }
}

function placeImages(L: number, H: number, images: GridImage[], l = GRID_CONFIG.BLOCKS_PER_IMAGE) {
  const pool: Array<{ x: number; y: number; noise: number }> = []
  const maxX = L - l
  const maxY = H - l

  const noise = createNoise()

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      pool.push({ x, y, noise: noise(x, y) })
    }
  }

  const sortedPool = pool.sort((a, b) => b.noise - a.noise)
  const shuffledPool = shuffle(sortedPool.slice(0, Math.ceil(sortedPool.length * 0.4)))
    .concat(sortedPool.slice(Math.ceil(sortedPool.length * 0.4)))

  const occupied = createOccupiedSet()
  const forbidden = createOccupiedSet()
  const placed: Array<{ x: number; y: number; image: GridImage; scale: number }> = []

  for (const image of images) {
    let foundPosition = null

    for (const pos of shuffledPool) {
      if (!areCellsFree(occupied, pos.x, pos.y, l)) continue
      if (isForbiddenByMaleFemale(forbidden, pos.x, pos.y, l)) continue
      foundPosition = pos
      break
    }

    if (!foundPosition) {
      console.warn(`Impossible de placer image: plus de position libre`)
      continue
    }

    placed.push({ x: foundPosition.x, y: foundPosition.y, image, scale: pickScale() })
    markCellsOccupied(occupied, foundPosition.x, foundPosition.y, l)
    applyMaleFemaleConstraint(forbidden, foundPosition.x, foundPosition.y, l, L, H)
  }

  return placed
}

interface GridBlock {
  gridX: number
  gridY: number
  hasImage: boolean
  image: GridImage & { scale: number; zoneWidth: number; zoneHeight: number }
}

interface GenerateGridResult {
  grid: (GridBlock | null)[][]
  GRID_WIDTH: number
  GRID_HEIGHT: number
  GALLERY_GRID: number
  placedImages: Array<{ x: number; y: number; image: GridImage; scale: number }>
}

export function generateGrid(config: { images?: GridImage[]; FILL_RATIO?: number }): GenerateGridResult {
  const { images = [], FILL_RATIO = GRID_CONFIG.FILL_RATIO } = config

  if (images.length === 0) {
    return {
      grid: [[]],
      GRID_WIDTH: 1,
      GRID_HEIGHT: 1,
      GALLERY_GRID: 1,
      placedImages: []
    }
  }

  const l = GRID_CONFIG.BLOCKS_PER_IMAGE
  const { L, H } = calculateGridSize(images.length, FILL_RATIO)
  const placedImages = placeImages(L, H, images, l)

  const grid: (GridBlock | null)[][] = Array(H).fill(null).map(() => Array(L).fill(null))

  for (const placed of placedImages) {
    grid[placed.y][placed.x] = {
      gridX: placed.x,
      gridY: placed.y,
      hasImage: true,
      image: {
        ...placed.image,
        scale: placed.scale,
        zoneWidth: l,
        zoneHeight: l
      }
    }
  }

  return {
    grid,
    GRID_WIDTH: L,
    GRID_HEIGHT: H,
    GALLERY_GRID: Math.max(L, H),
    placedImages
  }
}

export { GRID_CONFIG as CONFIG }
