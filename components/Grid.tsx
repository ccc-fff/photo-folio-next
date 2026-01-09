'use client'

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { generateGrid, GRID_CONFIG } from '@/utils/gridGenerator'
import { useGridVirtualization } from '@/hooks/useGridVirtualization'
import { useDrag } from '@/hooks/useDrag'
import { useSequencer, INITIAL_STATE } from '@/hooks/useSequencer'
import { urlFor } from '@/lib/sanity'
import { useI18n } from '@/lib/i18n'
import { filterTrulyVisibleBlocks, getBlockRanksByDistance, getBlockCenter, getDistance } from '@/hooks/useProximity'
import { MOTION_CONFIG } from '@/config/motion'
import { getTextColor } from '@/utils/colorUtils'
import GridBlock from './GridBlock'
import Viewer from './Viewer'
import ViewerUI from './ViewerUI'
import Header from './Header'
import Menu from './Menu'
import './Grid.css'
import type { Series, GridImage, About } from '@/lib/data'

// Type pour titre localisé
type LocalizedString = { fr: string; en: string } | string

interface GridProps {
  series: Series[]
  images: GridImage[]
  about: About | null
  defaultBackgroundColor?: string
}

export default function Grid({ series, images, about, defaultBackgroundColor = '#070707' }: GridProps) {
  const { state, play, set } = useSequencer(INITIAL_STATE)
  const { t } = useI18n()

  // Helper pour extraire un titre localisé
  const getTitle = (title: LocalizedString | undefined): string => {
    if (!title) return ''
    if (typeof title === 'string') return title
    return t(title) || title.fr || ''
  }

  const [hoveredImage, setHoveredImage] = useState<{
    seriesTitle: string
    indexInSeries?: number
    totalInSeries?: number
  } | null>(null)
  const [hoveredBgColor, setHoveredBgColor] = useState<string | null>(null)
  const mousePositionRef = useRef({ x: -1, y: -1 })

  const staggerRef = useRef<{ ranks: Map<string, number> | null; origin: { x: number; y: number } | null }>({ ranks: null, origin: null })
  const viewerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Propager la couleur de fond au document
  const viewerBgColor = (state.viewer as { backgroundColor?: string | null } | null)?.backgroundColor
  useEffect(() => {
    const color = viewerBgColor || hoveredBgColor || defaultBackgroundColor
    document.documentElement.style.setProperty('--background-color', color)
    document.documentElement.style.backgroundColor = color
  }, [viewerBgColor, hoveredBgColor, defaultBackgroundColor])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (viewerTimeoutRef.current) {
        clearTimeout(viewerTimeoutRef.current)
      }
    }
  }, [])

  // Fix hauteur mobile (100vh inclut la barre d'URL sur iOS/Android)
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVh()
    window.addEventListener('resize', setVh)
    return () => window.removeEventListener('resize', setVh)
  }, [])


  const gridConfig = useMemo(() => {
    if (images.length === 0) {
      return { grid: [[]], GRID_WIDTH: 1, GRID_HEIGHT: 1, GALLERY_GRID: 1, placedImages: [] }
    }
    return generateGrid({ images })
  }, [images])

  const { grid, GRID_WIDTH, GRID_HEIGHT, GALLERY_GRID } = gridConfig

  const { visibleBlocks, containerRef: virtualizationRef, zoneSize, isReady, handleDrag, scrollToSeries, getReferencePoint, isMobile } = useGridVirtualization(
    gridConfig,
    {
      GRID_WIDTH,
      GRID_HEIGHT,
      GALLERY_GRID,
      ...GRID_CONFIG,
      motionMode: state.motion
    }
  )

  const hasInitialAnimated = useRef(false)
  const initialVisibleKeysRef = useRef(new Set<string>())

  useEffect(() => {
    if (!isReady || hasInitialAnimated.current || visibleBlocks.length === 0) return
    if (state.grid !== 'initial-hidden') return

    hasInitialAnimated.current = true

    const centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const trulyVisible = filterTrulyVisibleBlocks(visibleBlocks, window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, centerPoint)
    staggerRef.current = { ranks, origin: centerPoint }

    trulyVisible.forEach(block => {
      initialVisibleKeysRef.current.add(block.key)
    })

    const maxRank = trulyVisible.length - 1
    const staggerDuration = (maxRank * MOTION_CONFIG.STAGGER_OFFSET) + MOTION_CONFIG.STAGGER_ITEM_FADE

    play('initial-load', { staggerDuration })
  }, [isReady, visibleBlocks, state.grid, play])

  const handleImageClick = useCallback((imageId: string, clickPosition: { x: number; y: number }) => {
    if (state.grid === 'fading-out' || state.grid === 'fading-in') return

    const clickedImage = images.find(img => img.id === imageId)
    if (!clickedImage) return

    const fullSeries = series.find(s => s._id === clickedImage.seriesId)
    if (!fullSeries || !fullSeries.images) return

    const viewerImgBuilder = (asset: unknown, w: number) => urlFor(asset).width(w).auto('format')
    const seriesImages = fullSeries.images.map((img, i) => ({
      id: img._key,
      url: viewerImgBuilder(img.asset, 1800).url(),
      srcSet: `${viewerImgBuilder(img.asset, 1200).url()} 1200w, ${viewerImgBuilder(img.asset, 1800).url()} 1800w, ${viewerImgBuilder(img.asset, 2400).url()} 2400w`,
      alt: img.alt || getTitle(fullSeries.title),
      seriesTitle: fullSeries.title,  // Passer l'objet localisé entier
      indexInSeries: i,
      totalInSeries: fullSeries.images.length
    }))

    const initialIndex = seriesImages.findIndex(img => img.id === imageId)

    const trulyVisible = filterTrulyVisibleBlocks(visibleBlocks, window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, clickPosition)
    staggerRef.current = { ranks, origin: clickPosition }

    const viewerData = {
      seriesId: fullSeries._id,
      seriesImages,
      currentIndex: initialIndex >= 0 ? initialIndex : 0,
      backgroundColor: fullSeries.backgroundColor || null,
      description: fullSeries.description || null
    }

    const maxRank = trulyVisible.length - 1
    const staggerDuration = (maxRank * MOTION_CONFIG.STAGGER_OFFSET) + MOTION_CONFIG.STAGGER_ITEM_FADE

    play('open-viewer', { staggerDuration, data: { viewer: viewerData } })
  }, [images, series, state.grid, visibleBlocks, play])

  const handleCloseViewer = useCallback(() => {
    const mousePos = mousePositionRef.current
    const origin = (mousePos && mousePos.x >= 0)
      ? mousePos
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    const trulyVisible = filterTrulyVisibleBlocks(visibleBlocks, window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, origin)
    staggerRef.current = { ranks, origin }

    const maxRank = trulyVisible.length - 1
    const staggerDuration = (maxRank * MOTION_CONFIG.STAGGER_OFFSET) + MOTION_CONFIG.STAGGER_ITEM_FADE

    play('close-viewer', { staggerDuration })
  }, [visibleBlocks, play])

  const handleViewerNext = useCallback(() => {
    if (!state.viewer) return
    const viewer = state.viewer as { seriesImages: unknown[]; currentIndex: number }
    const newIndex = (viewer.currentIndex + 1) % viewer.seriesImages.length
    set({ viewer: { ...viewer, currentIndex: newIndex } })
  }, [state.viewer, set])

  const handleViewerPrev = useCallback(() => {
    if (!state.viewer) return
    const viewer = state.viewer as { seriesImages: unknown[]; currentIndex: number }
    const len = viewer.seriesImages.length
    const newIndex = (viewer.currentIndex - 1 + len) % len
    set({ viewer: { ...viewer, currentIndex: newIndex } })
  }, [state.viewer, set])

  const handleMenuOpen = useCallback((clickPosition: { x: number; y: number }) => {
    if (state.grid === 'fading-out' || state.grid === 'fading-in' || state.menu) return

    const trulyVisible = filterTrulyVisibleBlocks(visibleBlocks, window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, clickPosition)
    staggerRef.current = { ranks, origin: clickPosition }

    const maxRank = trulyVisible.length - 1
    const staggerDuration = (maxRank * MOTION_CONFIG.STAGGER_OFFSET) + MOTION_CONFIG.STAGGER_ITEM_FADE

    play('open-menu', { staggerDuration })
  }, [state.grid, state.menu, visibleBlocks, play])

  const handleMenuClose = useCallback(() => {
    scrollToSeries(null)

    const mousePos = mousePositionRef.current
    const origin = (mousePos && mousePos.x >= 0)
      ? mousePos
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    const trulyVisible = filterTrulyVisibleBlocks(visibleBlocks, window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, origin)
    staggerRef.current = { ranks, origin }

    const maxRank = trulyVisible.length - 1
    const staggerDuration = (maxRank * MOTION_CONFIG.STAGGER_OFFSET) + MOTION_CONFIG.STAGGER_ITEM_FADE

    play('close-menu', { staggerDuration })
  }, [scrollToSeries, visibleBlocks, play])

  const dragRef = useDrag({ onDrag: handleDrag })

  const combinedRef = useRef<HTMLDivElement | null>(null)
  const setRefs = (element: HTMLDivElement | null) => {
    combinedRef.current = element
    virtualizationRef.current = element
    dragRef.current = element
  }

  const findBlockAtPoint = useCallback((blocks: typeof visibleBlocks, point: { x: number; y: number }) => {
    if (!point || point.x < 0 || point.y < 0) return null

    for (const block of blocks) {
      const { renderX, renderY, zoneWidth, zoneHeight } = block
      if (point.x >= renderX && point.x <= renderX + zoneWidth &&
          point.y >= renderY && point.y <= renderY + zoneHeight) {
        return block
      }
    }
    return null
  }, [])

  const findClosestBlock = useCallback((blocks: typeof visibleBlocks, refPoint: { x: number; y: number }) => {
    if (!refPoint || blocks.length === 0) return null

    let closest = null
    let minDistance = Infinity

    for (const block of blocks) {
      const center = getBlockCenter(block)
      const distance = getDistance(center, refPoint)
      if (distance < minDistance) {
        minDistance = distance
        closest = block
      }
    }
    return closest
  }, [])

  useEffect(() => {
    if (state.menu) return

    let activeBlock = null

    if (isMobile) {
      const centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      activeBlock = findClosestBlock(visibleBlocks, centerPoint)
    } else {
      const mousePos = mousePositionRef.current
      if (mousePos.x < 0 || mousePos.y < 0) {
        setHoveredImage(null)
        setHoveredBgColor(null)
        return
      }
      activeBlock = findBlockAtPoint(visibleBlocks, mousePos)
    }

    if (activeBlock) {
      const { image } = activeBlock
      setHoveredImage({
        seriesTitle: getTitle(image.seriesTitle),
        indexInSeries: image.indexInSeries,
        totalInSeries: image.totalInSeries
      })
      setHoveredBgColor(image.backgroundColor || null)
    } else {
      setHoveredImage(null)
      setHoveredBgColor(null)
    }
  }, [visibleBlocks, isMobile, findBlockAtPoint, findClosestBlock, state.menu])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return
    mousePositionRef.current = { x: e.clientX, y: e.clientY }
    if (state.menu) return
    const activeBlock = findBlockAtPoint(visibleBlocks, { x: e.clientX, y: e.clientY })
    if (activeBlock) {
      const { image } = activeBlock
      setHoveredImage({
        seriesTitle: getTitle(image.seriesTitle),
        indexInSeries: image.indexInSeries,
        totalInSeries: image.totalInSeries
      })
      setHoveredBgColor(image.backgroundColor || null)
    } else {
      setHoveredImage(null)
      setHoveredBgColor(null)
    }
  }, [isMobile, visibleBlocks, findBlockAtPoint, state.menu])

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return
    mousePositionRef.current = { x: -1, y: -1 }
    setHoveredImage(null)
    setHoveredBgColor(null)
  }, [isMobile])

  if (!isReady || images.length === 0) {
    return (
      <div ref={setRefs} className="grid-container">
        <div className="grid-loading">Chargement...</div>
      </div>
    )
  }

  // Type pour Portable Text
  type PortableTextBlock = {
    _type: string
    _key: string
    children?: { _type: string; text: string; marks?: string[] }[]
    markDefs?: { _type: string; _key: string; href?: string }[]
    style?: string
  }
  type LocalizedRichText = { fr: PortableTextBlock[]; en: PortableTextBlock[] } | PortableTextBlock[] | string

  const viewerState = state.viewer as {
    seriesId: string
    seriesImages: Array<{ id: string; url: string; srcSet: string; alt: string; seriesTitle: LocalizedString }>
    currentIndex: number
    backgroundColor: string | null
    description: LocalizedRichText | null
  } | null

  return (
    <div
      ref={setRefs}
      className={`grid-container ${viewerState ? 'viewer-active' : ''}`}
      style={{
        // CSS variables pour les composants enfants (Menu mobile, ViewerUI mobile)
        '--background-color': viewerState?.backgroundColor || hoveredBgColor || defaultBackgroundColor,
        '--text-color': getTextColor(viewerState?.backgroundColor || hoveredBgColor || defaultBackgroundColor)
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {state.header && (
        <Header hoveredImage={hoveredImage} onMenuClick={handleMenuOpen} />
      )}

      <div className="grid-canvas">
        {visibleBlocks.map((block) => {
          const ranks = staggerRef.current.ranks
          const rank = ranks?.get(block.key)
          const maxRank = ranks ? ranks.size - 1 : 0

          let animationDelay = 0
          if (rank !== undefined) {
            if (state.grid === 'fading-out' || state.grid === 'fading-in') {
              animationDelay = rank * MOTION_CONFIG.STAGGER_OFFSET
            }
          }

          const shouldAnimateOut = state.grid === 'fading-out' && rank !== undefined
          const shouldAnimateIn = state.grid === 'fading-in' && rank !== undefined

          const forceHidden = (state.grid === 'initial-hidden') ||
                              (state.grid === 'hidden') ||
                              (state.grid === 'fading-out' && rank === undefined)

          return (
            <GridBlock
              key={block.key}
              block={block}
              onImageClick={handleImageClick}
              isAnimatingOut={shouldAnimateOut}
              isAnimatingIn={shouldAnimateIn}
              animationDelay={animationDelay}
              proximityScale={block.proximityScale}
              forceHidden={forceHidden}
              highlightedSeriesId={state.highlightedSeriesId}
              highlightTransitionDuration={state.highlightTransitionDuration}
              menuOpen={state.menu}
              isInitiallyVisible={initialVisibleKeysRef.current.has(block.key)}
            />
          )
        })}
      </div>

      {viewerState && (
        <Viewer
          images={viewerState.seriesImages}
          currentIndex={viewerState.currentIndex}
          onNext={handleViewerNext}
          onPrev={handleViewerPrev}
          elementStates={{
            image: state.viewerImage,
            blur: state.viewerBlur,
          }}
        />
      )}

      {viewerState && (
        <ViewerUI
          images={viewerState.seriesImages}
          currentIndex={viewerState.currentIndex}
          description={viewerState.description}
          onClose={handleCloseViewer}
          onNext={handleViewerNext}
          onPrev={handleViewerPrev}
          elementStates={{
            ui: state.viewerUI,
            infos: state.viewerInfos,
          }}
          onToggleInfos={() => {
            const isOpen = state.viewerInfos?.state === 'visible'
            play(isOpen ? 'hide-infos' : 'show-infos')
          }}
        />
      )}

      {state.menu && (
        <Menu
          series={series}
          about={about}
          onClose={handleMenuClose}
          onSeriesHover={(seriesId) => {
            const prev = state.highlightedSeriesId
            let duration
            if (prev === null && seriesId !== null) {
              duration = MOTION_CONFIG.HIGHLIGHT.appear
            } else if (prev !== null && seriesId !== null && prev !== seriesId) {
              duration = MOTION_CONFIG.HIGHLIGHT.switch
            } else if (prev !== null && seriesId === null) {
              duration = MOTION_CONFIG.HIGHLIGHT.disappear
            } else {
              duration = MOTION_CONFIG.HIGHLIGHT.appear
            }
            set({ highlightedSeriesId: seriesId, highlightTransitionDuration: duration })
            scrollToSeries(seriesId)
          }}
          onSeriesClick={(seriesId) => {
            const fullSeries = series.find(s => s._id === seriesId)
            if (!fullSeries || !fullSeries.images) {
              set({ menu: false, highlightedSeriesId: null })
              return
            }

            const menuImgBuilder = (asset: unknown, w: number) => urlFor(asset).width(w).auto('format')
            const seriesImages = fullSeries.images.map((img, i) => ({
              id: img._key,
              url: menuImgBuilder(img.asset, 1800).url(),
              srcSet: `${menuImgBuilder(img.asset, 1200).url()} 1200w, ${menuImgBuilder(img.asset, 1800).url()} 1800w, ${menuImgBuilder(img.asset, 2400).url()} 2400w`,
              alt: img.alt || getTitle(fullSeries.title),
              seriesTitle: fullSeries.title,  // Passer l'objet localisé entier
              indexInSeries: i,
              totalInSeries: fullSeries.images.length
            }))

            scrollToSeries(null)

            set({
              menu: false,
              highlightedSeriesId: null,
              grid: 'hidden',
              motion: 'paused',
              viewer: {
                seriesId: fullSeries._id,
                seriesImages,
                currentIndex: 0,
                backgroundColor: fullSeries.backgroundColor || null,
                description: fullSeries.description || null
              },
              viewerBackground: { state: 'visible', duration: 300, ease: 'ease-out' },
            })

            if (viewerTimeoutRef.current) {
              clearTimeout(viewerTimeoutRef.current)
            }
            viewerTimeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current) return
              set({
                viewerImage: { state: 'visible', duration: 500, ease: 'ease-out' },
                viewerUI: { state: 'visible', duration: 200, ease: 'ease-out' },
              })
              viewerTimeoutRef.current = null
            }, 500)
          }}
        />
      )}
    </div>
  )
}
