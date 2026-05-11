/**
 * Requêtes GROQ pour Sanity
 *
 * Ces requêtes sont exécutées au moment du build (SSG)
 */

// Récupère toutes les séries avec leurs images et métadonnées
export const SERIES_QUERY = `
  *[_type == "series" && hidden != true] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current,
    order,
    gridCount,
    description,
    shortDescription,
    client,
    "backgroundColor": backgroundColor.hex,
    images[] {
      _key,
      alt,
      asset,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    }
  }
`

// Récupère les informations "À propos"
export const ABOUT_QUERY = `
  *[_type == "about"][0] {
    bio,
    contacts[] {
      _key,
      label,
      value,
      type
    }
  }
`

// Récupère les paramètres du site
export const SITE_SETTINGS_QUERY = `
  *[_type == "siteSettings"][0] {
    "defaultBackgroundColor": defaultBackgroundColor.hex
  }
`
