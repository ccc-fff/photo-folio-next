'use client'

import { useState, useRef, useEffect } from 'react'
import { urlFor } from '@/lib/sanity'
import type { Series, About } from '@/lib/data'
import './Menu.css'

const HOVER_DELAY = 150

interface MenuProps {
  series: Series[]
  about: About | null
  onClose: () => void
  onSeriesHover?: (seriesId: string | null) => void
  onSeriesClick?: (seriesId: string) => void
}

export default function Menu({ series, about, onClose, onSeriesHover, onSeriesClick }: MenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current)
      }
    }
  }, [])

  const handleAboutEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setHoveredItem('about')
    onSeriesHover?.(null)
  }

  const handleAboutLeave = () => {
    setHoveredItem(null)
  }

  const handleSeriesEnter = (seriesId: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setHoveredItem(seriesId)
    onSeriesHover?.(seriesId)
  }

  const handleSeriesLeave = () => {
    setHoveredItem(null)
    leaveTimeoutRef.current = setTimeout(() => {
      onSeriesHover?.(null)
      leaveTimeoutRef.current = null
    }, HOVER_DELAY)
  }

  const isAboutActive = hoveredItem === 'about'

  return (
    <div className={`menu ${isAboutActive ? 'about-active' : ''}`}>
      {/* Header fixe sur mobile */}
      <header className="menu-header-mobile">
        <button className="menu-close" onClick={onClose}>
          Close
        </button>
        <nav className="menu-nav">
          <button
            className={`menu-nav-item menu-name ${isAboutActive ? 'active' : ''}`}
            onMouseEnter={handleAboutEnter}
            onMouseLeave={handleAboutLeave}
          >
            Frederic Fornini
          </button>
          {about?.contacts?.map((contact, i) => (
            <a
              key={contact._key || i}
              href={contact.type === 'email' ? `mailto:${contact.value}` : contact.value}
              target={contact.type === 'url' ? '_blank' : undefined}
              rel={contact.type === 'url' ? 'noopener noreferrer' : undefined}
              className="menu-nav-item"
            >
              {contact.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Contenu scrollable sur mobile */}
      <div className="menu-content-mobile">
        <div className="menu-about-text-mobile">
          <img
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            alt=""
            className="touch-catcher"
            aria-hidden="true"
          />
          <span>{about?.bio || 'Photographe base a Paris.'}</span>
        </div>

        <div className="menu-series-grid-mobile">
          {series?.map((s) => (
            <button
              key={s._id}
              className="menu-series-card"
              onClick={() => onSeriesClick?.(s._id)}
            >
              <img
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt=""
                className="touch-catcher"
                aria-hidden="true"
              />
              {s.images?.[0] && (
                <img
                  src={urlFor(s.images[0].asset).width(400).auto('format').url()}
                  alt={s.title}
                  className="series-thumb"
                />
              )}
              <span>{s.title}</span>
            </button>
          ))}
          {series?.length % 2 === 1 && (
            <div className="menu-series-placeholder">
              <img
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt=""
                className="touch-catcher"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop : grille 12 colonnes */}
      <div className="menu-grid">
        <button className="menu-close" onClick={onClose}>
          Close
        </button>

        <nav className="menu-nav">
          <button
            className={`menu-nav-item menu-name ${isAboutActive ? 'active' : ''}`}
            onMouseEnter={handleAboutEnter}
            onMouseLeave={handleAboutLeave}
          >
            Frederic Fornini
          </button>
          {about?.contacts?.map((contact, i) => (
            <a
              key={contact._key || i}
              href={contact.type === 'email' ? `mailto:${contact.value}` : contact.value}
              target={contact.type === 'url' ? '_blank' : undefined}
              rel={contact.type === 'url' ? 'noopener noreferrer' : undefined}
              className="menu-nav-item"
            >
              {contact.label}
            </a>
          ))}
        </nav>

        <ul className="menu-series menu-series-list">
          {series?.map((s) => (
            <li key={s._id}>
              <button
                className={`menu-series-item ${hoveredItem === s._id ? 'active' : ''}`}
                onMouseEnter={() => handleSeriesEnter(s._id)}
                onMouseLeave={handleSeriesLeave}
                onClick={() => onSeriesClick?.(s._id)}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>

        <div className={`menu-about-text ${isAboutActive ? 'visible' : ''}`}>
          {about?.bio || 'Photographe base a Paris.'}
        </div>
      </div>
    </div>
  )
}
