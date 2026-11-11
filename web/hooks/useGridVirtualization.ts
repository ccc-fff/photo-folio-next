'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react'
import { MOTION_CONFIG } from '@/config/motion'
import { getProximityScale, getBlockCenter, getDistance } from './useProximity'
import type { GridImage } from '@/lib/data'

/*
 * Mur infini de la grille.
 *
 * React ne rend la liste des vignettes qu'une fois par mise en page (chargement,
 * redimensionnement). À chaque image d'animation, la boucle écrit directement la
 * position, la visibilité et l'échelle de proximité de chaque vignette sur son
 * élément (enregistré par registerBlock) : aucun rendu React pendant le défilement.
 * La boucle s'arrête quand plus rien ne bouge et repart au moindre geste
 * (souris, molette, glisser, changement de mode, recentrage sur une série).
 * La physique est celle d'avant, inchangée.
 */

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

/** Vignette telle que React la rend : identité et taille, sans position. */
export interface LayoutBlock extends GridBlock {
  logicalX: number
  logicalY: number
  copyX: number
  copyY: number
  key: string
  zoneWidth: number
  zoneHeight: number
}

/** Vignette avec sa position à l'instant (lue à la demande, jamais rendue par React). */
export interface PositionedBlock extends LayoutBlock {
  renderX: number
  renderY: number
  isHidden: boolean
  proximityScale: number
}

interface FramePosition {
  renderX: number
  renderY: number
  isHidden: boolean
  scale: number
}

interface Options {
  /** Vignette sous la souris (desktop) ou la plus proche du centre (mobile) ; appelé seulement quand elle change. */
  onActiveBlockChange?: (block: PositionedBlock | null) => void
}

const VISIBILITY_BUFFER = 100

// Débords sous les barres Safari (mobile) : variables CSS --bleed-top / --bleed-bottom
// (app/globals.css), 0 en desktop. La grille couvre aussi ces bandes.
function readBleeds() {
  if (typeof window === 'undefined') return { bleedTop: 0, bleedBottom: 0 }
  const cs = getComputedStyle(document.documentElement)
  return {
    bleedTop: parseFloat(cs.getPropertyValue('--bleed-top')) || 0,
    bleedBottom: parseFloat(cs.getPropertyValue('--bleed-bottom')) || 0,
  }
}

// Le document est arrêté au début de la scène : Safari peint alors la page sous ses barres.
function settleDocumentScroll() {
  const { bleedTop } = readBleeds()
  if (bleedTop > 0 && Math.round(window.scrollY) !== bleedTop) {
    window.scrollTo({ top: bleedTop, left: 0, behavior: 'instant' })
  }
}
const SCALE_EPSILON = 0.0005

// Écrit la position d'une vignette sur son élément (le cadre externe porte la
// translation, l'enveloppe interne l'échelle de proximité).
function writeElement(el: HTMLElement, p: FramePosition) {
  el.style.transform = `translate3d(${p.renderX}px, ${p.renderY}px, 0)`
  el.style.visibility = p.isHidden ? 'hidden' : 'visible'
  el.style.pointerEvents = p.isHidden ? 'none' : 'auto'
  const wrapper = el.firstElementChild as HTMLElement | null
  if (wrapper) wrapper.style.transform = `scale(${p.scale})`
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0
const noSubscribe = () => () => {}

export function useGridVirtualization(gridConfig: GridConfig, config: Config, options: Options = {}) {
  const containerRef = useRef<HTMLElement | null>(null)

  const {
    GRID_WIDTH = 1,
    GRID_HEIGHT = 1,
    BLOCK_WIDTH_VH = 18.5,
    BLOCK_HEIGHT_VH = 27.8,
    BLOCKS_PER_IMAGE = 2,
    motionMode = 'active'
  } = config

  // Appareil tactile : faux au rendu serveur, lu dans le navigateur.
  const isMobile = useSyncExternalStore(noSubscribe, isTouchDevice, () => false)
  const isMobileRef = useRef(false)

  // ── Mise en page (change seulement au redimensionnement) ──────────────────
  const calculateSizes = useCallback(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const vh = viewportHeight / 100
    const blockWidth = BLOCK_WIDTH_VH * vh
    const blockHeight = BLOCK_HEIGHT_VH * vh
    return {
      ...readBleeds(),
      blockWidth,
      blockHeight,
      zoneWidth: blockWidth * BLOCKS_PER_IMAGE,
      zoneHeight: blockHeight * BLOCKS_PER_IMAGE,
      viewportWidth,
      viewportHeight,
    }
  }, [BLOCK_WIDTH_VH, BLOCK_HEIGHT_VH, BLOCKS_PER_IMAGE])

  const [sizes, setSizes] = useState(() => calculateSizes())
  const { blockWidth, blockHeight, zoneWidth, zoneHeight, viewportWidth, viewportHeight, bleedTop, bleedBottom } = sizes

  const effectiveWidth = Math.max(1, GRID_WIDTH - 1)
  const effectiveHeight = Math.max(1, GRID_HEIGHT - 1)
  const GALLERY_WIDTH = effectiveWidth * blockWidth
  const GALLERY_HEIGHT = effectiveHeight * blockHeight

  const wallLayout = useMemo(() => {
    const copiesX = Math.ceil((viewportWidth + zoneWidth) / GALLERY_WIDTH)
    // le mur couvre aussi la bande sous la barre du bas (bleedBottom)
    const copiesY = Math.ceil((viewportHeight + bleedBottom + zoneHeight) / GALLERY_HEIGHT)
    return {
      viewportWidth,
      viewportHeight,
      bleedTop,
      bleedBottom,
      copiesX,
      copiesY,
      wallWidth: copiesX * GALLERY_WIDTH,
      wallHeight: copiesY * GALLERY_HEIGHT
    }
  }, [viewportWidth, viewportHeight, bleedTop, bleedBottom, zoneWidth, zoneHeight, GALLERY_WIDTH, GALLERY_HEIGHT])

  const blocks = useMemo(() => {
    const list: LayoutBlock[] = []
    const { copiesX, copiesY } = wallLayout

    for (let copyY = 0; copyY < copiesY; copyY++) {
      for (let copyX = 0; copyX < copiesX; copyX++) {
        for (let by = 0; by < effectiveHeight; by++) {
          for (let bx = 0; bx < effectiveWidth; bx++) {
            const gridBlock = gridConfig.grid[by]?.[bx]
            if (gridBlock && gridBlock.hasImage) {
              list.push({
                ...gridBlock,
                logicalX: bx * blockWidth,
                logicalY: by * blockHeight,
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
    return list
  }, [gridConfig, effectiveWidth, effectiveHeight, blockWidth, blockHeight, zoneWidth, zoneHeight, wallLayout])

  // ── État de la boucle (refs : lu et écrit hors rendu) ─────────────────────
  const offsetRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const targetVelRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const motionModeRef = useRef(motionMode)
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const targetOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const autoScrollDirectionRef = useRef(0)
  const autoScrollSpeedRef = useRef(1.5)

  const elementsRef = useRef(new Map<string, HTMLElement>())
  const positionsRef = useRef(new Map<string, FramePosition>())
  const activeKeyRef = useRef<string | null | undefined>(undefined)
  const frameRef = useRef<number | null>(null)
  const stepRef = useRef<() => boolean>(() => false)
  const onActiveRef = useRef(options.onActiveBlockChange)

  const [isReady, setIsReady] = useState(false)

  const { PHYSICS, SOURCES } = MOTION_CONFIG

  useEffect(() => {
    onActiveRef.current = options.onActiveBlockChange
  }, [options.onActiveBlockChange])

  // Calcule les positions de toutes les vignettes pour l'offset courant, les écrit
  // sur le DOM, signale la vignette active. Renvoie vrai si une échelle bouge encore.
  const applyFrame = (): boolean => {
    const { viewportWidth: vw, viewportHeight: vh, bleedTop: bTop, bleedBottom: bBottom, wallWidth, wallHeight } = wallLayout
    const offset = offsetRef.current
    const wrappedOffsetX = ((offset.x % wallWidth) + wallWidth) % wallWidth
    const wrappedOffsetY = ((offset.y % wallHeight) + wallHeight) % wallHeight

    const mobile = isMobileRef.current
    const refPoint = mobile ? { x: vw / 2, y: vh / 2 } : mousePositionRef.current
    const paused = motionModeRef.current === 'paused'
    const positions = positionsRef.current

    let scalesMoving = false
    let active: PositionedBlock | null = null
    let activeDistance = Infinity

    for (const block of blocks) {
      let renderX = block.logicalX + block.copyX * GALLERY_WIDTH - wrappedOffsetX
      let renderY = block.logicalY + block.copyY * GALLERY_HEIGHT - wrappedOffsetY

      if (renderX < -block.zoneWidth) renderX += wallWidth
      if (renderX > wallWidth - block.zoneWidth) renderX -= wallWidth
      if (renderY < -block.zoneHeight) renderY += wallHeight
      if (renderY > wallHeight - block.zoneHeight) renderY -= wallHeight

      const inViewX = renderX + block.zoneWidth > -VISIBILITY_BUFFER && renderX < vw + VISIBILITY_BUFFER
      const inViewY = renderY + block.zoneHeight > -VISIBILITY_BUFFER - bTop && renderY < vh + VISIBILITY_BUFFER + bBottom

      const placed = { ...block, renderX, renderY }
      const targetScale = paused
        ? MOTION_CONFIG.PROXIMITY_SCALE_MIN
        : getProximityScale(placed, refPoint, MOTION_CONFIG)
      const previous = positions.get(block.key)
      const currentScale = previous ? previous.scale : targetScale
      const scale = currentScale + (targetScale - currentScale) * MOTION_CONFIG.PROXIMITY_LERP_FACTOR
      if (Math.abs(targetScale - scale) > SCALE_EPSILON) scalesMoving = true

      const position = { renderX, renderY, isHidden: !(inViewX && inViewY), scale }
      positions.set(block.key, position)
      const el = elementsRef.current.get(block.key)
      if (el) writeElement(el, position)

      // Vignette active : sous la souris (desktop), la plus proche du centre (mobile)
      if (mobile) {
        const d = getDistance(getBlockCenter(placed), refPoint!)
        if (d < activeDistance) {
          activeDistance = d
          active = { ...placed, isHidden: position.isHidden, proximityScale: scale }
        }
      } else if (!active && refPoint && refPoint.x >= 0 && refPoint.y >= 0 &&
                 refPoint.x >= renderX && refPoint.x <= renderX + block.zoneWidth &&
                 refPoint.y >= renderY && refPoint.y <= renderY + block.zoneHeight) {
        active = { ...placed, isHidden: position.isHidden, proximityScale: scale }
      }
    }

    const activeKey = active ? active.key : null
    if (activeKey !== activeKeyRef.current) {
      activeKeyRef.current = activeKey
      onActiveRef.current?.(active)
    }

    return scalesMoving
  }

  // Une étape de la boucle : physique (inchangée), puis écriture des positions.
  // Renvoie vrai s'il faut une image de plus.
  const step = (): boolean => {
    const mode = motionModeRef.current
    if (mode === 'paused') {
      return applyFrame()
    }

    const mobile = isMobileRef.current
    const vel = velocityRef.current
    const target = targetVelRef.current

    // Vitesse souris (desktop) : poussée vers le bord, zone morte au centre
    let mouseX = 0
    let mouseY = 0
    const mousePos = mousePositionRef.current
    const container = containerRef.current
    if (!mobile && container && mousePos && !isDraggingRef.current && mode !== 'scroll-only') {
      const centerX = container.clientWidth / 2
      const centerY = container.clientHeight / 2
      const dx = mousePos.x - centerX
      const dy = mousePos.y - centerY
      const distance = Math.hypot(dx, dy)
      const maxRadius = Math.hypot(centerX, centerY)
      const deadZoneRadius = maxRadius * SOURCES.mouse.deadZone
      if (distance >= deadZoneRadius) {
        const t = Math.min(1, Math.max(0, (distance - deadZoneRadius) / (maxRadius - deadZoneRadius)))
        const speed = SOURCES.mouse.maxSpeed * Math.pow(t, SOURCES.mouse.curve)
        const angle = Math.atan2(dy, dx)
        mouseX = Math.cos(angle) * speed
        mouseY = Math.sin(angle) * speed
      }
    }

    // Défilement automatique (mobile) : dérive qui ralentit jusqu'à une vitesse minimale
    let autoX = 0
    let autoY = 0
    if (mobile && !isDraggingRef.current) {
      const speed = autoScrollSpeedRef.current
      const direction = autoScrollDirectionRef.current
      autoScrollSpeedRef.current = Math.max(SOURCES.autoScroll.minSpeed, speed * SOURCES.autoScroll.decay)
      autoX = Math.cos(direction) * speed
      autoY = Math.sin(direction) * speed
    }

    target.x = mouseX + autoX
    target.y = mouseY + autoY

    const isTransitioning = mode === 'decelerating' || mode === 'accelerating'
    const lerpFactor = isTransitioning
      ? PHYSICS.lerp.transition
      : (mobile ? PHYSICS.lerp.mobile : PHYSICS.lerp.desktop)

    vel.x += (target.x - vel.x) * lerpFactor
    vel.y += (target.y - vel.y) * lerpFactor

    const targetMag = Math.hypot(target.x, target.y)
    const activeFriction = isTransitioning ? PHYSICS.transitionFriction : PHYSICS.friction
    if (targetMag < 0.01 && !isDraggingRef.current) {
      vel.x *= activeFriction
      vel.y *= activeFriction
      // Coupe anti-résidu : seulement quand plus rien ne pousse. Appliquée
      // inconditionnellement, elle étrangle tout démarrage depuis zéro vers une
      // cible douce (incrément lerp < threshold) → grille mobile gelée à l'init
      // (~25 % des directions) et après chaque menu/viewer (100 %).
      if (Math.abs(vel.x) < PHYSICS.threshold) vel.x = 0
      if (Math.abs(vel.y) < PHYSICS.threshold) vel.y = 0
    }
    if (mode === 'decelerating' && targetMag > 0.01) {
      vel.x *= PHYSICS.transitionFriction
      vel.y *= PHYSICS.transitionFriction
    }

    const hasMovement = Math.abs(vel.x) > PHYSICS.threshold || Math.abs(vel.y) > PHYSICS.threshold

    if (hasMovement || isDraggingRef.current) {
      offsetRef.current.x += vel.x
      offsetRef.current.y += vel.y
      if (isDraggingRef.current) targetOffsetRef.current = null
    }

    // Recentrage doux sur une série (survol du menu)
    if (targetOffsetRef.current) {
      const tgt = targetOffsetRef.current
      const current = offsetRef.current
      const dx = tgt.x - current.x
      const dy = tgt.y - current.y
      if (Math.hypot(dx, dy) < 1) {
        offsetRef.current = { ...tgt }
        targetOffsetRef.current = null
      } else {
        current.x += dx * MOTION_CONFIG.PROXIMITY_LERP_FACTOR
        current.y += dy * MOTION_CONFIG.PROXIMITY_LERP_FACTOR
      }
    }

    const scalesMoving = applyFrame()

    return hasMovement || isDraggingRef.current || targetMag > 0.01 ||
      targetOffsetRef.current !== null || scalesMoving
  }

  // La boucle appelle toujours la dernière version de step (qui voit la mise en page courante)
  useEffect(() => {
    stepRef.current = step
  })

  // Relance la boucle si elle est arrêtée ; sans effet si elle tourne déjà.
  const wake = useCallback(() => {
    if (frameRef.current !== null) return
    const run = () => {
      frameRef.current = null
      if (stepRef.current()) frameRef.current = requestAnimationFrame(run)
    }
    frameRef.current = requestAnimationFrame(run)
  }, [])

  // Démarrage : direction de dérive tirée au hasard, premières positions, boucle lancée
  useEffect(() => {
    isMobileRef.current = isTouchDevice()
    autoScrollDirectionRef.current = Math.random() * Math.PI * 2
    offsetRef.current = { x: 0, y: 0 }
    stepRef.current = step
    applyFrame()
    setIsReady(true)
    wake()
    settleDocumentScroll()
    window.addEventListener('load', settleDocumentScroll)
    const positions = positionsRef.current
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      positions.clear()
      window.removeEventListener('load', settleDocumentScroll)
    }
    // Montage seulement : step et applyFrame sont relus via stepRef ensuite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake])

  // Nouvelle mise en page : oublier les vignettes disparues, repositionner
  useEffect(() => {
    const keys = new Set(blocks.map(b => b.key))
    for (const key of positionsRef.current.keys()) {
      if (!keys.has(key)) positionsRef.current.delete(key)
    }
    wake()
  }, [blocks, wake])

  // Changement de mode (pause, menu, transitions) : la boucle doit le voir
  useEffect(() => {
    motionModeRef.current = motionMode
    if (motionMode === 'paused' || motionMode === 'scroll-only') {
      velocityRef.current = { x: 0, y: 0 }
      targetVelRef.current = { x: 0, y: 0 }
    }
    wake()
  }, [motionMode, wake])

  // Enregistrement des éléments par GridBlock ; position posée dès le montage
  const registerBlock = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      elementsRef.current.set(key, el)
      const p = positionsRef.current.get(key)
      if (p) writeElement(el, p)
      wake()
    } else {
      elementsRef.current.delete(key)
    }
  }, [wake])

  // Positions à l'instant, pour les calculs ponctuels (vague d'apparition…)
  const getBlocks = useCallback((): PositionedBlock[] => {
    return blocks.map(block => {
      const p = positionsRef.current.get(block.key)
      return {
        ...block,
        renderX: p?.renderX ?? 0,
        renderY: p?.renderY ?? 0,
        isHidden: p?.isHidden ?? true,
        proximityScale: p?.scale ?? MOTION_CONFIG.PROXIMITY_SCALE_MIN
      }
    })
  }, [blocks])

  // Forcer un nouvel envoi de la vignette active (ex. à la fermeture du menu)
  const refreshActiveBlock = useCallback(() => {
    activeKeyRef.current = undefined
    wake()
  }, [wake])

  useEffect(() => {
    const handleResize = () => {
      setSizes(calculateSizes())
      velocityRef.current = { x: 0, y: 0 }
      settleDocumentScroll()
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

      if (isMobileRef.current && (Math.abs(finalVelocity.x) > 1 || Math.abs(finalVelocity.y) > 1)) {
        autoScrollDirectionRef.current = Math.atan2(finalVelocity.y, finalVelocity.x)
        const speed = Math.hypot(finalVelocity.x, finalVelocity.y)
        autoScrollSpeedRef.current = Math.min(SOURCES.autoScroll.maxSpeed, Math.max(SOURCES.autoScroll.minSpeed, speed * 0.3))
      }
    }
    wake()
  }, [wake, SOURCES])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (motionModeRef.current === 'paused') return
      e.preventDefault()
      velocityRef.current.x += e.deltaX * SOURCES.wheel.multiplier
      velocityRef.current.y += e.deltaY * SOURCES.wheel.multiplier
      wake()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mousePositionRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      wake()
    }

    const handleMouseLeave = () => {
      mousePositionRef.current = null
      wake()
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [wake, SOURCES])

  const scrollToSeries = useCallback((seriesId: string | null) => {
    if (!seriesId) {
      targetOffsetRef.current = null
      return
    }

    const targetBlock = blocks.find(block => block.image?.seriesId === seriesId)
    if (!targetBlock) return

    const container = containerRef.current
    if (!container) return

    const absoluteX = targetBlock.logicalX + targetBlock.copyX * GALLERY_WIDTH
    const absoluteY = targetBlock.logicalY + targetBlock.copyY * GALLERY_HEIGHT

    targetOffsetRef.current = {
      x: absoluteX - (container.clientWidth - targetBlock.zoneWidth) / 2,
      y: absoluteY - (container.clientHeight - targetBlock.zoneHeight) / 2
    }
    wake()
  }, [blocks, GALLERY_WIDTH, GALLERY_HEIGHT, wake])

  return {
    blocks,
    registerBlock,
    getBlocks,
    refreshActiveBlock,
    containerRef,
    isReady,
    handleDrag,
    scrollToSeries,
    isMobile
  }
}
