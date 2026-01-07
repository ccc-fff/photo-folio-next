'use client'

import { useState, useRef, useEffect } from 'react'
import { PortableText } from '@portabletext/react'
import { urlFor } from '@/lib/sanity'
import { useI18n } from '@/lib/i18n'
import type { Series, About } from '@/lib/data'
import './Menu.css'

// Type pour Portable Text block
type PortableTextBlock = {
  _type: string
  _key: string
  children?: { _type: string; text: string; marks?: string[] }[]
  markDefs?: { _type: string; _key: string; href?: string }[]
  style?: string
}

const HOVER_DELAY = 150

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

interface MenuProps {
  series: Series[]
  about: About | null
  onClose: () => void
  onSeriesHover?: (seriesId: string | null) => void
  onSeriesClick?: (seriesId: string) => void
}

export default function Menu({ series, about, onClose, onSeriesHover, onSeriesClick }: MenuProps) {
  const { locale, setLocale, t } = useI18n()
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

  // Récupérer le titre localisé d'une série
  const getSeriesTitle = (s: Series) => {
    if (typeof s.title === 'string') return s.title
    return t(s.title) || s.title?.fr || ''
  }

  // Récupérer le label localisé d'un contact
  const getContactLabel = (contact: About['contacts'][0]) => {
    if (typeof contact.label === 'string') return contact.label
    return t(contact.label) || contact.label?.fr || ''
  }

  // Récupérer la bio localisée (peut être string ou rich text)
  const renderBio = () => {
    if (!about?.bio) return 'Photographe basé à Paris.'

    // Si c'est une string simple (ancien format)
    if (typeof about.bio === 'string') return about.bio

    // Si c'est un array direct (Portable Text non localisé)
    if (Array.isArray(about.bio)) {
      return <PortableText value={about.bio} components={richTextComponents} />
    }

    // Si c'est un objet localisé { fr: ..., en: ... }
    if (about.bio && typeof about.bio === 'object' && 'fr' in about.bio) {
      const localizedBio = t(about.bio as { fr: PortableTextBlock[]; en: PortableTextBlock[] })
      if (Array.isArray(localizedBio)) {
        return <PortableText value={localizedBio} components={richTextComponents} />
      }
    }

    // Fallback
    return 'Photographe basé à Paris.'
  }

  // Toggle langue
  const LanguageToggle = () => (
    <div className="language-toggle">
      <button
        className={`lang-btn ${locale === 'fr' ? 'active' : ''}`}
        onClick={() => setLocale('fr')}
      >
        Fr
      </button>
      <button
        className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
        onClick={() => setLocale('en')}
      >
        Eng
      </button>
    </div>
  )

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
            Frédéric Fornini
          </button>
          {about?.contacts?.map((contact, i) => (
            <a
              key={contact._key || i}
              href={contact.type === 'email' ? `mailto:${contact.value}` : contact.value}
              target={contact.type === 'url' ? '_blank' : undefined}
              rel={contact.type === 'url' ? 'noopener noreferrer' : undefined}
              className="menu-nav-item"
            >
              {getContactLabel(contact)}
            </a>
          ))}
          <LanguageToggle />
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
          <span>{renderBio()}</span>
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
                  alt={getSeriesTitle(s)}
                  className="series-thumb"
                />
              )}
              <span>{getSeriesTitle(s)}</span>
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
            Frédéric Fornini
          </button>
          {about?.contacts?.map((contact, i) => (
            <a
              key={contact._key || i}
              href={contact.type === 'email' ? `mailto:${contact.value}` : contact.value}
              target={contact.type === 'url' ? '_blank' : undefined}
              rel={contact.type === 'url' ? 'noopener noreferrer' : undefined}
              className="menu-nav-item"
            >
              {getContactLabel(contact)}
            </a>
          ))}
          <LanguageToggle />
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
                {getSeriesTitle(s)}
              </button>
            </li>
          ))}
        </ul>

        <div className={`menu-about-text ${isAboutActive ? 'visible' : ''}`}>
          {renderBio()}
        </div>
      </div>
    </div>
  )
}
