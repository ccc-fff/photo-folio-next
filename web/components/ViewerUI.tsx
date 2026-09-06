'use client'

import { useEffect, useCallback, useRef } from 'react'
import { PortableText } from '@portabletext/react'
import { useI18n, LocalizedField } from '@/lib/i18n'
import { track } from '@/lib/track'
import './ViewerUI.css'

// Type pour Portable Text block
type PortableTextBlock = {
  _type: string
  _key: string
  children?: { _type: string; text: string }[]
  [key: string]: unknown
}

interface ViewerImage {
  id: string
  seriesTitle?: string | { fr: string; en: string }
}

interface AnimState {
  state: string
  duration: number
  ease: string
}

interface Credit {
  role: string
  name: string
  url?: string
}

// Description peut être: string, PortableText[], ou localisé { fr: ..., en: ... }
type DescriptionType = string | PortableTextBlock[] | LocalizedField<string | PortableTextBlock[]> | null

interface ViewerUIProps {
  images: ViewerImage[]
  currentIndex: number
  description: DescriptionType
  credits?: Credit[] | null
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onToggleInfos: () => void
  elementStates?: {
    ui?: AnimState | string
    infos?: AnimState | string
  }
}

// Composants pour le rich text
const richTextComponents = {
  marks: {
    medium: ({ children }: { children: React.ReactNode }) => (
      <span style={{ fontWeight: 500 }}>{children}</span>
    ),
    link: ({ value, children }: { value?: { href?: string }; children: React.ReactNode }) => (
      <a href={value?.href || '#'} target="_blank" rel="noopener noreferrer">{children}</a>
    )
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
  credits,
  onClose,
  onNext,
  onPrev,
  onToggleInfos,
  elementStates = {}
}: ViewerUIProps) {
  const { t } = useI18n()
  const uiAnim = getAnimProps(elementStates.ui, 200, 'ease-out')
  const infosAnim = getAnimProps(elementStates.infos, 200, 'ease-out')
  const showInfos = infosAnim.state === 'visible'

  const handleToggleInfos = () => {
    if (!showInfos) track('infos-open')
    onToggleInfos()
  }

  // Helper pour récupérer le titre de série localisé
  const getSeriesTitle = (title: string | { fr: string; en: string } | undefined) => {
    if (!title) return ''
    if (typeof title === 'string') return title
    return t(title) || title.fr || ''
  }

  // Helper pour rendre la description (string ou PortableText, localisé ou non)
  const renderDescription = () => {
    if (!description) return null

    // Si c'est une string simple
    if (typeof description === 'string') return description

    // Si c'est un array (Portable Text non localisé)
    if (Array.isArray(description)) {
      return <PortableText value={description} components={richTextComponents} />
    }

    // Si c'est un objet localisé { fr: ..., en: ... }
    if (description && typeof description === 'object' && ('fr' in description || 'en' in description)) {
      const localized = t(description as LocalizedField<string | PortableTextBlock[]>)
      if (!localized) return null

      if (typeof localized === 'string') return localized
      if (Array.isArray(localized)) {
        return <PortableText value={localized} components={richTextComponents} />
      }
    }

    return null
  }

  // Vérifier si on a une description à afficher
  const hasDescription = (() => {
    if (!description) return false
    if (typeof description === 'string') return description.length > 0
    if (Array.isArray(description)) return description.length > 0
    if (typeof description === 'object' && ('fr' in description || 'en' in description)) {
      const localized = t(description as LocalizedField<string | PortableTextBlock[]>)
      if (!localized) return false
      if (typeof localized === 'string') return localized.length > 0
      if (Array.isArray(localized)) return localized.length > 0
    }
    return false
  })()

  const hasCredits = Array.isArray(credits) && credits.length > 0
  // Le panneau infos s'ouvre s'il y a au moins une description ou des crédits
  const hasInfos = hasDescription || hasCredits

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
        {hasInfos && (
          <button
            className={`viewer-infos-mobile ${showInfos ? 'active' : ''}`}
            onClick={handleToggleInfos}
          >
            {showInfos ? 'close' : 'infos'}
          </button>
        )}
      </header>

      <div className="viewer-header-mobile-row2" style={uiStyle}>
        <span className="viewer-series-mobile">{getSeriesTitle(currentImage?.seriesTitle)}</span>
        <span className="viewer-counter-mobile">
          {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
      </div>

      <footer className="viewer-footer" style={uiStyle}>
        <div className="viewer-info">
          <span className="viewer-series">{getSeriesTitle(currentImage?.seriesTitle)}</span>
          <span className="viewer-counter">
            {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
          {hasInfos && (
            <button
              className={`viewer-infos-toggle ${showInfos ? 'active' : ''}`}
              onClick={handleToggleInfos}
            >
              {showInfos ? 'close' : 'infos'}
            </button>
          )}
        </div>
      </footer>

      {hasInfos && (
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
                {renderDescription()}
              </div>
              {hasCredits && (
                <div className="viewer-credits">
                  {credits!.map((c, i) => (
                    <div key={i} className="viewer-credit">
                      <span className="viewer-credit-role">{c.role} :</span>
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="viewer-credit-name"
                          onClick={(e) => {
                            e.stopPropagation()
                            track('credit-click', { name: c.name })
                          }}
                        >
                          {c.name}
                        </a>
                      ) : (
                        <span className="viewer-credit-name">{c.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
