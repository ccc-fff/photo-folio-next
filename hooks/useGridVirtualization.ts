'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MOTION_CONFIG } from '@/config/motion'
import { getProximityScale } from './useProximity'
import type { GridImage } from '@/lib/data'

interface GridBlock {
  gridX: number
  gridY: number
  hasImage: boolean
  image: GridImage & { zoneWidth: number; zoneHeight: number }
}

interface GridConfig {
  grid: (GridBlock | null)[][]
  GRID_WIDTH: number
  GRID_HEIGHT: number
}

interface Config {
  GRID_WIDTH: number
  GRID_HEIGHT: number
  GALLERY_GRID: number
  BLOCK_WIDTH_VH: number
  BLOCK_HEIGHT_VH: number
  BLOCKS_PER_IMAGE: number
  motionMode: string
}

interface VisibleBlock extends GridBlock {
  logicalX: number
  logicalY: number
  copyX: number
  copyY: number
  key: string
  zoneWidth: number
  zoneHeight: number
  renderX: number
  renderY: number
  isHidden: boolean
  proximityScale: number
}

export function useGridVirtualization(gridConfig: GridConfig, config: Config) {
  const [visibleBlocks, setVisibleBlocks] = useState<VisibleBlock[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const {
    GRID_WIDTH = 1,
    GRID_HEIGHT = 1,
    BLOCK_WIDTH_VH = 18.5,
    BLOCK_HEIGHT_VH = 27.8,
    BLOCKS_PER_IMAGE = 2,
    motionMode = 'active'
  } = config

  const motionModeRef = useRef(motionMode)

  const calculateSizes = useCallback(() => {
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) / 100
    const blockWidth = BLOCK_WIDTH_VH * vh
    const blockHeight = BLOCK_HEIGHT_VH * vh
    const zoneWidth = blockWidth * BLOCKS_PER_IMAGE
    const zoneHeight = blockHeight * BLOCKS_PER_IMAGE
    return { blockWidth, blockHeight, zoneWidth, zoneHeight, vh }
  }, [BLOCK_WIDTH_VH, BLOCK_HEIGHT_VH, BLOCKS_PER_IMAGE])

  const [sizes, setSizes] = useState(() => calculateSizes())
  const { blockWidth, blockHeight, zoneWidth, zoneHeight } = sizes

  const effectiveWidth = Math.max(1, GRID_WIDTH - 1)
  const effectiveHeight = Math.max(1, GRID_HEIGHT - 1)
  const GALLERY_WIDTH = effectiveWidth * blockWidth
  const GALLERY_HEIGHT = effectiveHeight * blockHeight

  const offsetRef = useRef({ x: 0, y: 0 })
  const [isReady, setIsReady] = useState(false)

  const velocityRef = useRef({ x: 0, y: 0 })
  const targetVelRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  const { PHYSICS, SOURCES } = MOTION_CONFIG
  const friction = PHYSICS.friction
  const transitionFriction = PHYSICS.transitionFriction
  const threshold = PHYSICS.threshold
  const WHEEL_MULTIPLIER = SOURCES.wheel.multiplier
  const MOUSE_MAX_SPEED = SOURCES.mouse.maxSpeed
  const DEAD_ZONE_RATIO = SOURCES.mouse.deadZone
  const MOUSE_CURVE_POWER = SOURCES.mouse.curve
  const AUTO_SCROLL_MIN_SPEED = SOURCES.autoScroll.minSpeed
  const AUTO_SCROLL_MAX_SPEED = SOURCES.autoScroll.maxSpeed
  const AUTO_SCROLL_DECAY = SOURCES.autoScroll.decay

  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const currentScalesRef = useRef(new Map<string, number>())
  const targetOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const autoScrollDirectionRef = useRef(Math.random() * Math.PI * 2)
  const autoScrollSpeedRef = useRef(1.5)

  const isMobile = useRef(false)

  // Detect mobile on client side only
  useEffect(() => {
    isMobile.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  // Cleanup scales map on unmount (memory leak fix)
  useEffect(() => {
    return () => {
      currentScalesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    motionModeRef.current = motionMode
    if (motionMode === 'paused' || motionMode === 'scroll-only') {
      velocityRef.current = { x: 0, y: 0 }
      targetVelRef.current = { x: 0, y: 0 }
    }
  }, [motionMode])

  const getReferencePoint = useCallback(() => {
    if (isMobile.current) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    }
    return mousePositionRef.current
  }, [])

  const calculateMouseVelocity = useCallback(() => {
    if (isMobile.current) return { x: 0, y: 0 }

    const container = containerRef.current
    const mousePos = mousePositionRef.current
    const mode = motionModeRef.current

    if (!container || !mousePos || isDraggingRef.current || mode === 'scroll-only' || mode === 'paused') {
      return { x: 0, y: 0 }
    }

    const centerX = container.clientWidth / 2
    const centerY = container.clientHeight / 2
    const dx = mousePos.x - centerX
    const dy = mousePos.y - centerY
    const distance = Math.hypot(dx, dy)
    const maxRadius = Math.hypot(centerX, centerY)
    const deadZoneRadius = maxRadius * DEAD_ZONE_RATIO

    if (distance < deadZoneRadius) return { x: 0, y: 0 }

    const t = (distance - deadZoneRadius) / (maxRadius - deadZoneRadius)
    const clampedT = Math.min(1, Math.max(0, t))
    const speed = MOUSE_MAX_SPEED * Math.pow(clampedT, MOUSE_CURVE_POWER)
    const angle = Math.atan2(dy, dx)

    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
  }, [MOUSE_MAX_SPEED, DEAD_ZONE_RATIO, MOUSE_CURVE_POWER])

  const calculateAutoScrollVelocity = useCallback(() => {
    if (motionModeRef.current === 'paused') return { x: 0, y: 0 }
    if (!isMobile.current || isDraggingRef.current) return { x: 0, y: 0 }

    const speed = autoScrollSpeedRef.current
    const direction = autoScrollDirectionRef.current
    autoScrollSpeedRef.current = Math.max(AUTO_SCROLL_MIN_SPEED, speed * AUTO_SCROLL_DECAY)

    return { x: Math.cos(direction) * speed, y: Math.sin(direction) * speed }
  }, [AUTO_SCROLL_MIN_SPEED, AUTO_SCROLL_DECAY])

  const wallLayout = useMemo(() => {
    const container = containerRef.current
    const defaultWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const defaultHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const viewportWidth = container?.clientWidth || defaultWidth
    const viewportHeight = container?.clientHeight || defaultHeight
    const copiesX = Math.ceil((viewportWidth + zoneWidth) / GALLERY_WIDTH)
    const copiesY = Math.ceil((viewportHeight + zoneHeight) / GALLERY_HEIGHT)

    return {
      viewportWidth,
      viewportHeight,
      copiesX,
      copiesY,
      wallWidth: copiesX * GALLERY_WIDTH,
      wallHeight: copiesY * GALLERY_HEIGHT
    }
  }, [zoneWidth, zoneHeight, GALLERY_WIDTH, GALLERY_HEIGHT, sizes])

  const allBlocks = useMemo(() => {
    const blocks: Array<GridBlock & { logicalX: number; logicalY: number; copyX: number; copyY: number; key: string; zoneWidth: number; zoneHeight: number }> = []
    const { copiesX, copiesY } = wallLayout

    for (let copyY = 0; copyY < copiesY; copyY++) {
      for (let copyX = 0; copyX < copiesX; copyX++) {
        for (let by = 0; by < effectiveHeight; by++) {
          for (let bx = 0; bx < effectiveWidth; bx++) {
            const gridBlock = gridConfig.grid[by]?.[bx]
            if (gridBlock && gridBlock.hasImage) {
              const logicalX = bx * blockWidth
              const logicalY = by * blockHeight

              blocks.push({
                ...gridBlock,
                logicalX,
                logicalY,
                copyX,
                copyY,
                key: `${gridBlock.image.id}-${copyX}-${copyY}`,
                zoneWidth,
                zoneHeight
              })
            }
          }
        }
      }
    }

    return blocks
  }, [gridConfig, effectiveWidth, effectiveHeight, GALLERY_WIDTH, GALLERY_HEIGHT, blockWidth, blockHeight, zoneWidth, zoneHeight, wallLayout])

  const updateRenderedBlocks = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { viewportWidth, viewportHeight, wallWidth, wallHeight } = wallLayout
    const offset = offsetRef.current

    const wrappedOffsetX = ((offset.x % wallWidth) + wallWidth) % wallWidth
    const wrappedOffsetY = ((offset.y % wallHeight) + wallHeight) % wallHeight

    const renderedBlocks = allBlocks.map(block => {
      const absoluteX = block.logicalX + block.copyX * GALLERY_WIDTH
      const absoluteY = block.logicalY + block.copyY * GALLERY_HEIGHT

      let renderX = absoluteX - wrappedOffsetX
      let renderY = absoluteY - wrappedOffsetY

      if (renderX < -block.zoneWidth) renderX += wallWidth
      if (renderX > wallWidth - block.zoneWidth) renderX -= wallWidth
      if (renderY < -block.zoneHeight) renderY += wallHeight
      if (renderY > wallHeight - block.zoneHeight) renderY -= wallHeight

      const VISIBILITY_BUFFER = 100
      const inViewX = renderX + block.zoneWidth > -VISIBILITY_BUFFER && renderX < viewportWidth + VISIBILITY_BUFFER
      const inViewY = renderY + block.zoneHeight > -VISIBILITY_BUFFER && renderY < viewportHeight + VISIBILITY_BUFFER

      const blockWithPosition = { ...block, renderX, renderY }
      const refPoint = getReferencePoint()
      const targetScale = motionModeRef.current === 'paused'
        ? MOTION_CONFIG.PROXIMITY_SCALE_MIN
        : getProximityScale(blockWithPosition, refPoint, MOTION_CONFIG)

      const currentScale = currentScalesRef.current.get(block.key) ?? targetScale
      const lerpedScale = currentScale + (targetScale - currentScale) * MOTION_CONFIG.PROXIMITY_LERP_FACTOR
      currentScalesRef.current.set(block.key, lerpedScale)

      return {
        ...block,
        renderX,
        renderY,
        isHidden: !(inViewX && inViewY),
        proximityScale: lerpedScale
      }
    })

    if (currentScalesRef.current.size > allBlocks.length * 1.1) {
      const currentKeys = new Set(allBlocks.map(b => b.key))
      for (const key of currentScalesRef.current.keys()) {
        if (!currentKeys.has(key)) {
          currentScalesRef.current.delete(key)
        }
      }
    }

    setVisibleBlocks(renderedBlocks as VisibleBlock[])
  }, [allBlocks, wallLayout, GALLERY_WIDTH, GALLERY_HEIGHT, getReferencePoint])

  const animationLoop = useCallback(() => {
    updateRenderedBlocks()

    const mode = motionModeRef.current
    if (mode === 'paused') {
      animationFrameRef.current = requestAnimationFrame(animationLoop)
      return
    }

    const vel = velocityRef.current
    const target = targetVelRef.current

    const mouseVel = calculateMouseVelocity()
    const autoScrollVel = calculateAutoScrollVelocity()

    target.x = mouseVel.x + autoScrollVel.x
    target.y = mouseVel.y + autoScrollVel.y

    const isTransitioning = mode === 'decelerating' || mode === 'accelerating'
    const lerpFactor = isTransitioning
      ? PHYSICS.lerp.transition
      : (isMobile.current ? PHYSICS.lerp.mobile : PHYSICS.lerp.desktop)

    vel.x += (target.x - vel.x) * lerpFactor
    vel.y += (target.y - vel.y) * lerpFactor

    const targetMag = Math.hypot(target.x, target.y)
    const activeFriction = isTransitioning ? transitionFriction : friction
    if (targetMag < 0.01 && !isDraggingRef.current) {
      vel.x *= activeFriction
      vel.y *= activeFriction
    }
    if (mode === 'decelerating' && targetMag > 0.01) {
      vel.x *= transitionFriction
      vel.y *= transitionFriction
    }

    if (Math.abs(vel.x) < threshold) vel.x = 0
    if (Math.abs(vel.y) < threshold) vel.y = 0

    const hasMovement = Math.abs(vel.x) > threshold || Math.abs(vel.y) > threshold

    if (hasMovement || isDraggingRef.current) {
      offsetRef.current.x += vel.x
      offsetRef.current.y += vel.y
      if (isDraggingRef.current) targetOffsetRef.current = null
    }

    if (targetOffsetRef.current) {
      const tgt = targetOffsetRef.current
      const current = offsetRef.current
      const lerpF = MOTION_CONFIG.PROXIMITY_LERP_FACTOR

      const dx = tgt.x - current.x
      const dy = tgt.y - current.y
      const distance = Math.hypot(dx, dy)

      if (distance < 1) {
        offsetRef.current = { ...tgt }
        targetOffsetRef.current = null
      } else {
        offsetRef.current.x += dx * lerpF
        offsetRef.current.y += dy * lerpF
      }
    }

    animationFrameRef.current = requestAnimationFrame(animationLoop)
  }, [updateRenderedBlocks, calculateMouseVelocity, calculateAutoScrollVelocity, PHYSICS, friction, transitionFriction, threshold])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    offsetRef.current = { x: 0, y: 0 }
    updateRenderedBlocks()
    setIsReady(true)
    animationFrameRef.current = requestAnimationFrame(animationLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [GALLERY_WIDTH, GALLERY_HEIGHT, updateRenderedBlocks, animationLoop])

  useEffect(() => {
    const handleResize = () => {
      const newSizes = calculateSizes()
      setSizes(newSizes)
      velocityRef.current = { x: 0, y: 0 }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculateSizes])

  const handleDrag = useCallback((dx: number, dy: number, isDragging: boolean, finalVelocity: { x: number; y: number } | null = null) => {
    if (motionModeRef.current === 'paused') return

    isDraggingRef.current = isDragging

    if (isDragging) {
      velocityRef.current = { x: dx, y: dy }
      targetVelRef.current = { x: dx, y: dy }
    } else if (finalVelocity) {
      velocityRef.current = { x: finalVelocity.x, y: finalVelocity.y }

      if (isMobile.current && (Math.abs(finalVelocity.x) > 1 || Math.abs(finalVelocity.y) > 1)) {
        autoScrollDirectionRef.current = Math.atan2(finalVelocity.y, finalVelocity.x)
        const speed = Math.hypot(finalVelocity.x, finalVelocity.y)
        autoScrollSpeedRef.current = Math.min(AUTO_SCROLL_MAX_SPEED, Math.max(AUTO_SCROLL_MIN_SPEED, speed * 0.3))
      }
    }
  }, [AUTO_SCROLL_MAX_SPEED, AUTO_SCROLL_MIN_SPEED])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (motionModeRef.current === 'paused') return
      e.preventDefault()
      velocityRef.current.x += e.deltaX * WHEEL_MULTIPLIER
      velocityRef.current.y += e.deltaY * WHEEL_MULTIPLIER
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [WHEEL_MULTIPLIER])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mousePositionRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleMouseLeave = () => {
      mousePositionRef.current = null
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const scrollToSeries = useCallback((seriesId: string | null) => {
    if (!seriesId) {
      targetOffsetRef.current = null
      return
    }

    const targetBlock = allBlocks.find(block => block.image?.seriesId === seriesId)
    if (!targetBlock) return

    const container = containerRef.current
    if (!container) return

    const viewportWidth = container.clientWidth
    const viewportHeight = container.clientHeight

    const absoluteX = targetBlock.logicalX + targetBlock.copyX * GALLERY_WIDTH
    const absoluteY = targetBlock.logicalY + targetBlock.copyY * GALLERY_HEIGHT

    const targetX = absoluteX - (viewportWidth - targetBlock.zoneWidth) / 2
    const targetY = absoluteY - (viewportHeight - targetBlock.zoneHeight) / 2

    targetOffsetRef.current = { x: targetX, y: targetY }
  }, [allBlocks, GALLERY_WIDTH, GALLERY_HEIGHT])

  return {
    visibleBlocks,
    containerRef,
    zoneSize: { width: zoneWidth, height: zoneHeight },
    isReady,
    handleDrag,
    scrollToSeries,
    getReferencePoint,
    isMobile: isMobile.current
  }
}
