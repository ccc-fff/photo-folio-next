'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import './Viewer.css'

interface ViewerImage {
  id: string
  url: string
  srcSet?: string
  alt?: string
  seriesTitle?: string
}

interface AnimState {
  state: string
  duration: number
  ease: string
}

interface ViewerProps {
  images: ViewerImage[]
  currentIndex: number
  onNext: () => void
  onPrev: () => void
  elementStates?: {
    image?: AnimState | string
    blur?: AnimState | string
  }
}

function useImagePreloader(images: ViewerImage[], currentIndex: number) {
  const preloadedRef = useRef(new Map<string, HTMLImageElement>())
  const idleCallbackRef = useRef<number | ReturnType<typeof setTimeout> | null>(null)

  const optimalWidth = useMemo(() => {
    if (typeof window === 'undefined') return 1800
    const vw = window.innerWidth
    const dpr = window.devicePixelRatio || 1
    const needed = vw * dpr
    if (needed <= 1200) return 1200
    if (needed <= 1800) return 1800
    return 2400
  }, [])

  const getOptimalUrl = useCallback((img: ViewerImage) => {
    if (!img?.srcSet) return img?.url
    const srcSetParts = img.srcSet.split(', ')
    const targetEntry = srcSetParts.find(p => p.includes(`${optimalWidth}w`))
    return targetEntry ? targetEntry.split(' ')[0] : img.url
  }, [optimalWidth])

  useEffect(() => {
    if (!images || images.length === 0) return

    let cancelled = false

    const preload = (index: number) => {
      if (cancelled) return
      const idx = ((index % images.length) + images.length) % images.length
      const img = images[idx]
      if (!img) return

      const key = `${img.id}-${optimalWidth}`
      if (preloadedRef.current.has(key)) return

      const loader = new Image()
      loader.src = getOptimalUrl(img)
      preloadedRef.current.set(key, loader)
    }

    preload(currentIndex)
    preload(currentIndex + 1)
    preload(currentIndex - 1)

    let offset = 2
    const loadMore = () => {
      if (cancelled || offset > images.length) return
      preload(currentIndex + offset)
      preload(currentIndex - offset)
      offset++

      if ('requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(loadMore)
      } else {
        idleCallbackRef.current = setTimeout(loadMore, 50)
      }
    }

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      if ('requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(loadMore)
      } else {
        loadMore()
      }
    }, 100)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      if (idleCallbackRef.current) {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(idleCallbackRef.current as number)
        } else {
          clearTimeout(idleCallbackRef.current as ReturnType<typeof setTimeout>)
        }
        idleCallbackRef.current = null
      }
    }
  }, [images, currentIndex, getOptimalUrl, optimalWidth])

  return { getOptimalUrl, optimalWidth }
}

const getAnimProps = (element: AnimState | string | undefined, defaultDuration = 300, defaultEase = 'ease-out') => {
  if (!element) return { state: 'hidden', duration: defaultDuration, ease: defaultEase }
  if (typeof element === 'string') return { state: element, duration: defaultDuration, ease: defaultEase }
  return {
    state: element.state || 'hidden',
    duration: element.duration || defaultDuration,
    ease: element.ease || defaultEase
  }
}

export default function Viewer({ images, currentIndex, onNext, onPrev, elementStates = {} }: ViewerProps) {
  const imgAnim = getAnimProps(elementStates.image, 500, 'ease-out')
  const blurAnim = getAnimProps(elementStates.blur, 200, 'ease-out')
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const { getOptimalUrl } = useImagePreloader(images, currentIndex)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - (touchStartY.current || 0)

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) onPrev()
      else onNext()
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  const handleImageClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const half = rect.width / 2

    if (clickX < half) onPrev()
    else onNext()
  }

  if (!images || images.length === 0) return null

  const currentImage = images[currentIndex]

  const baseOpacity = imgAnim.state === 'visible' ? 1 : 0
  const finalOpacity = blurAnim.state === 'active' ? 0.2 : baseOpacity

  const imgStyle = {
    opacity: finalOpacity,
    filter: blurAnim.state === 'active' ? 'blur(40px)' : 'blur(0px)',
    transition: `opacity ${blurAnim.duration}ms ${blurAnim.ease}, filter ${blurAnim.duration}ms ${blurAnim.ease}`
  }

  return (
    <div className="viewer-overlay">
      <div
        className="viewer-image-container"
        style={imgStyle}
        onClick={handleImageClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={getOptimalUrl(currentImage)}
          alt={currentImage?.alt || currentImage?.seriesTitle || ''}
          className="viewer-image"
          fetchPriority="high"
        />
      </div>
    </div>
  )
}
