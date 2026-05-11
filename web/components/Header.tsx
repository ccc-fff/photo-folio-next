'use client'

import './Header.css'

interface HoveredImage {
  seriesTitle: string
  indexInSeries?: number
  totalInSeries?: number
}

interface HeaderProps {
  hoveredImage: HoveredImage | null
  onMenuClick: (position: { x: number; y: number }) => void
}

/**
 * Header de la page principale
 *
 * Desktop : "Menu" (col 1) + Nom série (col 3)
 * Mobile : "Menu" (ligne 1) + Nom série (ligne 2)
 */
export default function Header({ hoveredImage, onMenuClick }: HeaderProps) {
  const seriesInfo = hoveredImage ? (
    <>
      {hoveredImage.seriesTitle}
      {hoveredImage.indexInSeries !== undefined && (
        <span className="header-series-position">
          {' '}{hoveredImage.indexInSeries + 1}/{hoveredImage.totalInSeries}
        </span>
      )}
    </>
  ) : null

  return (
    <header className="header">
      <div className="header-grid">
        <button
          className="header-menu"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickPosition = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            }
            onMenuClick(clickPosition)
          }}
        >
          Menu
        </button>
        <div className="header-series">
          {seriesInfo}
        </div>
      </div>
    </header>
  )
}
