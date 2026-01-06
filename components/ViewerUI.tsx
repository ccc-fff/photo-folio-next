'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import './ViewerUI.css'

interface ViewerImage {
  id: string
  seriesTitle?: string
}

interface AnimState {
  state: string
  duration: number
  ease: string
}

interface ViewerUIProps {
  images: ViewerImage[]
  currentIndex: number
  description: string | null
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onToggleInfos: () => void
  elementStates?: {
    ui?: AnimState | string
    infos?: AnimState | string
  }
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

export default function ViewerUI({
  images,
  currentIndex,
  description,
  onClose,
  onNext,
  onPrev,
  onToggleInfos,
  elementStates = {}
}: ViewerUIProps) {
  const uiAnim = getAnimProps(elementStates.ui, 200, 'ease-out')
  const infosAnim = getAnimProps(elementStates.infos, 200, 'ease-out')
  const showInfos = infosAnim.state === 'visible'
  const [cursorSide, setCursorSide] = useState<'left' | 'right' | null>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  const handleInfosTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [])

  const handleInfosTouchEnd = useCallback((e: React.TouchEvent) => {
    const { x, y, time } = touchStartRef.current
    const deltaX = Math.abs(e.changedTouches[0].clientX - x)
    const deltaY = Math.abs(e.changedTouches[0].clientY - y)
    const deltaTime = Date.now() - time

    if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
      e.preventDefault()
      onToggleInfos()
    }
  }, [onToggleInfos])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInfos) {
          onToggleInfos()
        } else {
          onClose()
        }
      }
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrev, showInfos, onToggleInfos])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const imageContainer = document.querySelector('.viewer-image-container')
      if (!imageContainer) {
        setCursorSide(null)
        return
      }

      const rect = imageContainer.getBoundingClientRect()
      const isOverImage = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )

      if (isOverImage) {
        const imageMidX = rect.left + rect.width / 2
        setCursorSide(e.clientX < imageMidX ? 'left' : 'right')
        setCursorPos({ x: e.clientX, y: e.clientY })
      } else {
        setCursorSide(null)
      }
    }

    const handleMouseLeave = () => {
      setCursorSide(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  if (!images || images.length === 0) return null

  const currentImage = images[currentIndex]

  const uiStyle = {
    opacity: uiAnim.state === 'visible' ? 1 : 0,
    transition: `opacity ${uiAnim.duration}ms ${uiAnim.ease}`
  }

  return (
    <div className={`viewer-ui ${showInfos ? 'infos-open' : ''}`}>
      <header className="viewer-header" style={uiStyle}>
        <button
          className="viewer-back"
          onClick={onClose}
          disabled={showInfos}
          style={{ opacity: showInfos ? 0.2 : 1, transition: 'opacity 300ms ease' }}
        >
          Home
        </button>
        {description && (
          <button
            className={`viewer-infos-mobile ${showInfos ? 'active' : ''}`}
            onClick={onToggleInfos}
          >
            {showInfos ? 'close' : 'infos'}
          </button>
        )}
      </header>

      <div className="viewer-header-mobile-row2" style={uiStyle}>
        <span className="viewer-series-mobile">{currentImage?.seriesTitle}</span>
        <span className="viewer-counter-mobile">
          {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
      </div>

      <footer className="viewer-footer" style={uiStyle}>
        <div className="viewer-info">
          <span className="viewer-series">{currentImage?.seriesTitle}</span>
          <span className="viewer-counter">
            {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
          {description && (
            <button
              className={`viewer-infos-toggle ${showInfos ? 'active' : ''}`}
              onClick={onToggleInfos}
            >
              {showInfos ? 'close' : 'infos'}
            </button>
          )}
        </div>
      </footer>

      {description && (
        <>
          <div
            className={`viewer-description-backdrop ${showInfos ? 'visible' : ''}`}
            onClick={onToggleInfos}
          />
          <div
            className={`viewer-description ${showInfos ? 'visible' : ''}`}
            onClick={onToggleInfos}
            onTouchStart={handleInfosTouchStart}
            onTouchEnd={handleInfosTouchEnd}
            style={{
              opacity: showInfos ? 1 : 0,
              transition: `opacity ${infosAnim.duration}ms ${infosAnim.ease}`,
              cursor: 'pointer'
            }}
          >
            <div className="viewer-description-content">
              <img
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt=""
                className="touch-catcher"
                aria-hidden="true"
              />
              <div className="viewer-description-text">
                {description}
              </div>
            </div>
          </div>
        </>
      )}

      {cursorSide && (
        <div
          className="viewer-cursor"
          style={{ left: cursorPos.x, top: cursorPos.y }}
        >
          {cursorSide === 'left' ? '←' : '→'}
        </div>
      )}
    </div>
  )
}
