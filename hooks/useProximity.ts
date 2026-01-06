/**
 * Utilitaires de calcul de distance et proximity
 */

interface Point {
  x: number
  y: number
}

interface Block {
  renderX: number
  renderY: number
  zoneWidth: number
  zoneHeight: number
  key: string
}

interface ProximityConfig {
  PROXIMITY_SCALE_MIN: number
  PROXIMITY_SCALE_MAX: number
  PROXIMITY_RADIUS_RATIO: number
  PROXIMITY_FALLOFF: number
}

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

export const getBlockCenter = (block: Block): Point => {
  return {
    x: block.renderX + block.zoneWidth / 2,
    y: block.renderY + block.zoneHeight / 2
  }
}

export const filterTrulyVisibleBlocks = (
  blocks: Block[],
  viewportWidth: number,
  viewportHeight: number
): Block[] => {
  return blocks.filter(block => {
    const blockRight = block.renderX + block.zoneWidth
    const blockBottom = block.renderY + block.zoneHeight
    return block.renderX < viewportWidth &&
           blockRight > 0 &&
           block.renderY < viewportHeight &&
           blockBottom > 0
  })
}

export const getBlockRanksByDistance = (
  blocks: Block[],
  refPoint: Point
): Map<string, number> => {
  const blocksWithDistance = blocks.map(block => ({
    key: block.key,
    distance: getDistance(getBlockCenter(block), refPoint)
  }))

  blocksWithDistance.sort((a, b) => a.distance - b.distance)

  const ranks = new Map<string, number>()
  blocksWithDistance.forEach((item, index) => {
    ranks.set(item.key, index)
  })

  return ranks
}

export const getProximityScale = (
  block: Block,
  mousePos: Point | null,
  config: ProximityConfig
): number => {
  if (!mousePos) return config.PROXIMITY_SCALE_MIN

  const center = getBlockCenter(block)
  const distance = getDistance(center, mousePos)

  const maxDimension = Math.max(window.innerWidth, window.innerHeight)
  const radius = maxDimension * config.PROXIMITY_RADIUS_RATIO

  const t = Math.min(1, distance / radius)
  const falloff = Math.pow(t, config.PROXIMITY_FALLOFF)

  return config.PROXIMITY_SCALE_MAX -
         (config.PROXIMITY_SCALE_MAX - config.PROXIMITY_SCALE_MIN) * falloff
}
