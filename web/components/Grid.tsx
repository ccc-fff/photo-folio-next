'use client'

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { generateGrid, GRID_CONFIG } from '@/utils/gridGenerator'
import { useGridVirtualization, type PositionedBlock } from '@/hooks/useGridVirtualization'
import { useDrag } from '@/hooks/useDrag'
import { useSequencer, INITIAL_STATE, type SequencerState } from '@/hooks/useSequencer'
import { useI18n } from '@/lib/i18n'
import { filterTrulyVisibleBlocks, getBlockRanksByDistance } from '@/hooks/useProximity'
import { MOTION_CONFIG } from '@/config/motion'
import { getTextColor } from '@/utils/colorUtils'
import { buildViewerData, type ViewerData } from '@/lib/viewerData'
import { track } from '@/lib/track'
import GridBlock from './GridBlock'
import Header from './Header'
const Viewer = dynamic(() => import('./Viewer'), { ssr: false })
const ViewerUI = dynamic(() => import('./ViewerUI'), { ssr: false })
const Menu = dynamic(() => import('./Menu'))
import './Grid.css'
import type { Series, GridImage, About } from '@/lib/data'

interface GridProps {
  series: Series[]
  images: GridImage[]
  about: About | null
  defaultBackgroundColor?: string
  initialViewerData?: ViewerData | null
}

export default function Grid({
  series,
  images,
  about,
  defaultBackgroundColor = '#070707',
  initialViewerData
}: GridProps) {
  // État initial du sequencer : viewer ouvert d'emblée si arrivée directe sur /[slug]
  const dynamicInitial = useMemo<SequencerState>(() => {
    if (initialViewerData) {
      return {
        ...INITIAL_STATE,
        grid: 'hidden',
        motion: 'paused',
        viewer: initialViewerData,
      }
    }
    return INITIAL_STATE
    // initialViewerData est figé au mount (vient du server component)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { state, play, set } = useSequencer(dynamicInitial)
  const { title } = useI18n()

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

  // Précharge les chunks Viewer + ViewerUI en idle après chargement complet
  // de la page, pour que le 1er clic image n'attende pas le download du chunk.
  useEffect(() => {
    const preload = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
        ?? ((cb: () => void) => setTimeout(cb, 300))
      idle(() => {
        import('./Viewer')
        import('./ViewerUI')
      })
    }
    if (document.readyState === 'complete') {
      preload()
    } else {
      window.addEventListener('load', preload, { once: true })
      return () => window.removeEventListener('load', preload)
    }
  }, [])


  const gridConfig = useMemo(() => {
    if (images.length === 0) {
      return { grid: [[]], GRID_WIDTH: 1, GRID_HEIGHT: 1, GALLERY_GRID: 1, placedImages: [] }
    }
    return generateGrid({ images })
  }, [images])

  const { GRID_WIDTH, GRID_HEIGHT, GALLERY_GRID } = gridConfig

  // Vignette active (sous la souris en desktop, au centre en mobile) : envoyée par
  // la boucle du mur seulement quand elle change. Ignorée pendant le menu.
  const menuOpenRef = useRef(state.menu)
  useEffect(() => {
    menuOpenRef.current = state.menu
  }, [state.menu])

  const handleActiveBlockChange = useCallback((block: PositionedBlock | null) => {
    if (menuOpenRef.current) return
    if (block) {
      const { image } = block
      setHoveredImage({
        seriesTitle: title(image.seriesTitle),
        indexInSeries: image.indexInSeries,
        totalInSeries: image.totalInSeries
      })
      setHoveredBgColor(image.backgroundColor || null)
    } else {
      setHoveredImage(null)
      setHoveredBgColor(null)
    }
  }, [title])

  const { blocks, registerBlock, getBlocks, refreshActiveBlock, containerRef: virtualizationRef, isReady, handleDrag, scrollToSeries, isMobile } = useGridVirtualization(
    gridConfig,
    {
      GRID_WIDTH,
      GRID_HEIGHT,
      GALLERY_GRID,
      ...GRID_CONFIG,
      motionMode: state.motion
    },
    { onActiveBlockChange: handleActiveBlockChange }
  )

  // Menu refermé : la vignette active a pu changer pendant qu'il était ouvert
  useEffect(() => {
    if (!state.menu) refreshActiveBlock()
  }, [state.menu, refreshActiveBlock])

  // Ordre de disparition / réapparition des vignettes autour d'un point (clic,
  // souris ou centre de l'écran) : mémorise les rangs lus par GridBlock et
  // renvoie la durée totale de la vague. Seul endroit où ce calcul est fait.
  const prepareStagger = useCallback((origin: { x: number; y: number }) => {
    const trulyVisible = filterTrulyVisibleBlocks(getBlocks(), window.innerWidth, window.innerHeight)
    const ranks = getBlockRanksByDistance(trulyVisible, origin)
    staggerRef.current = { ranks, origin }
    return (trulyVisible.length - 1) * MOTION_CONFIG.STAGGER_OFFSET + MOTION_CONFIG.STAGGER_ITEM_FADE
  }, [getBlocks])

  // Point de départ de la vague à la fermeture : la souris si elle est sur la page, sinon le centre.
  const pointerOrCenter = () => {
    const p = mousePositionRef.current
    return p.x >= 0 ? p : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  const hasInitialAnimated = useRef(false)
  const initialVisibleKeysRef = useRef(new Set<string>())

  useEffect(() => {
    if (!isReady || hasInitialAnimated.current || blocks.length === 0) return
    if (state.grid !== 'initial-hidden') return

    hasInitialAnimated.current = true

    const staggerDuration = prepareStagger({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    // Les vignettes de la première vague sont celles visibles au premier affichage
    staggerRef.current.ranks?.forEach((_, key) => initialVisibleKeysRef.current.add(key))

    play('initial-load', { staggerDuration })
  }, [isReady, blocks, state.grid, play, prepareStagger])

  // Arrivée directe sur /[slug] : déclencher l'apparition du viewer (fade in)
  // sans rejouer la séquence d'ouverture qui suppose une grille visible au départ.
  const hasInitialDirectOpen = useRef(false)
  useEffect(() => {
    if (!initialViewerData || hasInitialDirectOpen.current) return
    hasInitialDirectOpen.current = true
    play('open-viewer-direct')
    track('viewer-open', { source: 'direct' })
  }, [initialViewerData, play])

  // Bouton retour/avant du navigateur : aligner le viewer sur l'URL.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const match = path.match(/^\/([^/]+?)(?:\/(\d+))?\/?$/)

      if (path === '/' || !match) {
        if (state.viewer) {
          play('close-viewer', { staggerDuration: prepareStagger(pointerOrCenter()) })
        }
        return
      }

      const [, slug, indexStr] = match
      const targetSeries = series.find(s => s.slug === slug)
      if (!targetSeries || !targetSeries.images) return

      const idx = indexStr ? Math.max(0, parseInt(indexStr, 10) - 1) : 0
      const newViewerData = buildViewerData(targetSeries, idx, title)

      if (state.viewer) {
        set({ viewer: newViewerData })
      } else {
        set({
          viewer: newViewerData,
          grid: 'hidden',
          motion: 'paused',
          header: false,
        })
        play('open-viewer-direct')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [state.viewer, series, play, set, title, prepareStagger])

  const handleImageClick = useCallback((imageId: string, clickPosition: { x: number; y: number }) => {
    if (state.grid === 'fading-out' || state.grid === 'fading-in') return

    const clickedImage = images.find(img => img.id === imageId)
    if (!clickedImage) return

    const fullSeries = series.find(s => s._id === clickedImage.seriesId)
    if (!fullSeries || !fullSeries.images) return

    const viewerData = buildViewerData(fullSeries, clickedImage.indexInSeries, title)

    play('open-viewer', { staggerDuration: prepareStagger(clickPosition), data: { viewer: viewerData } })
    track('viewer-open', { source: 'grid' })

    if (fullSeries.slug) {
      const url = clickedImage.indexInSeries > 0
        ? `/${fullSeries.slug}/${clickedImage.indexInSeries + 1}`
        : `/${fullSeries.slug}`
      window.history.pushState({}, '', url)
    }
  }, [images, series, state.grid, play, title, prepareStagger])

  const handleCloseViewer = useCallback(() => {
    play('close-viewer', { staggerDuration: prepareStagger(pointerOrCenter()) })

    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
  }, [play, prepareStagger])

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
    play('open-menu', { staggerDuration: prepareStagger(clickPosition) })
  }, [state.grid, state.menu, play, prepareStagger])

  const handleMenuClose = useCallback(() => {
    scrollToSeries(null)
    play('close-menu', { staggerDuration: prepareStagger(pointerOrCenter()) })
  }, [scrollToSeries, play, prepareStagger])

  const dragRef = useDrag({ onDrag: handleDrag })

  const combinedRef = useRef<HTMLElement | null>(null)
  const setRefs = (element: HTMLElement | null) => {
    combinedRef.current = element
    virtualizationRef.current = element
    dragRef.current = element
  }

  // Position souris côté page : point de départ de la vague à la fermeture
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return
    mousePositionRef.current = { x: e.clientX, y: e.clientY }
  }, [isMobile])

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return
    mousePositionRef.current = { x: -1, y: -1 }
  }, [isMobile])

  if (!isReady || images.length === 0) {
    return (
      <main ref={setRefs} className="grid-container">
        <div className="grid-loading">Chargement...</div>
      </main>
    )
  }

  const viewerState = state.viewer as ViewerData | null

  return (
    <main
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
        {blocks.map((block) => {
          const ranks = staggerRef.current.ranks
          const rank = ranks?.get(block.key)

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
              registerBlock={registerBlock}
              onImageClick={handleImageClick}
              isAnimatingOut={shouldAnimateOut}
              isAnimatingIn={shouldAnimateIn}
              animationDelay={animationDelay}
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
          viewerScale={viewerState.viewerScale}
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
          credits={viewerState.credits}
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

            const viewerData = buildViewerData(fullSeries, 0, title)
            track('viewer-open', { source: 'menu' })

            scrollToSeries(null)

            set({
              menu: false,
              highlightedSeriesId: null,
              grid: 'hidden',
              motion: 'paused',
              viewer: viewerData,
              viewerBackground: { state: 'visible', duration: 300, ease: 'ease-out' },
            })

            if (fullSeries.slug) {
              window.history.pushState({}, '', `/${fullSeries.slug}`)
            }

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
    </main>
  )
}
