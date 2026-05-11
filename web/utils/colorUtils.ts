/**
 * Utilitaires de calcul de couleurs pour le contraste automatique
 */

/**
 * Parse une couleur CSS (hex, rgb, rgba) et retourne {r, g, b}
 */
export function parseColor(color: string | null | undefined): { r: number; g: number; b: number } {
  if (!color) return { r: 255, g: 255, b: 255 }

  // Hex: #RGB ou #RRGGBB
  if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }
  }

  // rgb(r, g, b) ou rgba(r, g, b, a)
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    }
  }

  // Fallback: blanc
  return { r: 255, g: 255, b: 255 }
}

/**
 * Calcule la luminosité relative (0-255) selon la formule YIQ
 * https://www.w3.org/TR/AERT/#color-contrast
 */
export function getLuminance(color: string | null | undefined): number {
  const { r, g, b } = parseColor(color)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * Retourne 'dark' ou 'light' selon la luminosité du fond
 * < 128 = fond sombre → texte clair (white)
 * >= 128 = fond clair → texte sombre (black)
 */
export function getContrastMode(backgroundColor: string | null | undefined): 'dark' | 'light' {
  const luminance = getLuminance(backgroundColor)
  return luminance < 128 ? 'dark' : 'light'
}

/**
 * Retourne la couleur de texte appropriée pour un fond donné
 */
export function getTextColor(backgroundColor: string | null | undefined): string {
  const mode = getContrastMode(backgroundColor)
  return mode === 'dark' ? '#ffffff' : '#333333'
}
