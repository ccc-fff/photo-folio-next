'use client'

import { MOTION_CONFIG } from '@/config/motion'
import type { GridImage } from '@/lib/data'

interface Block {
  image: GridImage
  renderX: number
  renderY: number
  zoneWidth: number
  zoneHeight: number
  isHidden: boolean
}

interface GridBlockProps {
  block: Block
  onImageClick?: (imageId: string, position: { x: number; y: number }) => void
  isAnimatingOut?: boolean
  isAnimatingIn?: boolean
  animationDelay?: number
  proximityScale?: number
  forceHidden?: boolean
  highlightedSeriesId?: string | null
  highlightTransitionDuration?: number
  menuOpen?: boolean
  isInitiallyVisible?: boolean
}

/**
 * GridBlock - Affiche une image dans la grille
 */
export default function GridBlock({
  block,
  onImageClick,
  isAnimatingOut = false,
  isAnimatingIn = false,
  animationDelay = 0,
  proximityScale = 1.0,
  forceHidden = false,
  highlightedSeriesId = null,
  highlightTransitionDuration = 450,
  menuOpen = false,
  isInitiallyVisible = false
}: GridBlockProps) {
  const { image, renderX, renderY, zoneWidth, zoneHeight, isHidden } = block

  const scale = image.scale || 0.80
  const availableWidth = zoneWidth * scale
  const availableHeight = zoneHeight * scale
  const aspectRatio = image.aspectRatio || 1

  let imageWidth: number, imageHeight: number

  if (aspectRatio >= 1) {
    imageWidth = availableWidth
    imageHeight = availableWidth / aspectRatio
    if (imageHeight > availableHeight) {
      imageHeight = availableHeight
      imageWidth = availableHeight * aspectRatio
    }
  } else {
    imageHeight = availableHeight
    imageWidth = availableHeight * aspectRatio
    if (imageWidth > availableWidth) {
      imageWidth = availableWidth
      imageHeight = availableWidth / aspectRatio
    }
  }

  const offsetX = (zoneWidth - imageWidth) / 2
  const offsetY = (zoneHeight - imageHeight) / 2
  const seriesTitle = image.seriesTitle || ''

  let highlightOpacity = 1
  if (menuOpen) {
    if (highlightedSeriesId) {
      highlightOpacity = image.seriesId === highlightedSeriesId ? 1 : 0.2
    } else {
      highlightOpacity = 0
    }
  }

  const animationStyle = isAnimatingOut ? {
    opacity: 0,
    transition: `opacity ${MOTION_CONFIG.STAGGER_ITEM_FADE}ms ${MOTION_CONFIG.STAGGER_EASING}`,
    transitionDelay: `${animationDelay}ms`
  } : isAnimatingIn ? {
    animation: `fadeIn ${MOTION_CONFIG.STAGGER_ITEM_FADE}ms ${MOTION_CONFIG.STAGGER_EASING} ${animationDelay}ms both`
  } : forceHidden ? {
    opacity: 0
  } : {}

  return (
    <div
      className={`grid-item ${isAnimatingOut ? 'fading-out' : ''} ${isAnimatingIn ? 'fading-in' : ''}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${zoneWidth}px`,
        height: `${zoneHeight}px`,
        transform: `translate3d(${renderX}px, ${renderY}px, 0)`,
        visibility: isHidden ? 'hidden' : 'visible',
        pointerEvents: isHidden ? 'none' : 'auto',
        ...animationStyle
      }}
    >
      <div
        className="image-wrapper"
        style={{
          position: 'absolute',
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `scale(${proximityScale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          // LQIP comme background (visible pendant chargement)
          backgroundImage: `url(${image.lqip})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          // Opacité sur le wrapper entier (inclut le LQIP)
          opacity: highlightOpacity,
          transition: `opacity ${highlightTransitionDuration}ms ease`
        }}
      >
        <img
          src={image.url}
          srcSet={image.srcSet}
          sizes={`${Math.round(imageWidth)}px`}
          alt={image.alt || seriesTitle}
          loading={isInitiallyVisible ? "eager" : "lazy"}
          fetchPriority={isInitiallyVisible ? "high" : "auto"}
          width={Math.round(imageWidth)}
          height={Math.round(imageWidth / (image.aspectRatio || 1))}
          draggable={false}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickPosition = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            }
            onImageClick?.(image.id, clickPosition)
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  )
}
