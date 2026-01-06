/**
 * Fonctions de récupération des données
 *
 * Ces fonctions sont appelées au moment du build (SSG)
 * Les données sont intégrées dans le HTML généré
 */
import { client, urlFor } from './sanity'
import { SERIES_QUERY, ABOUT_QUERY } from './queries'

// Types pour TypeScript
export interface GridImage {
  id: string
  url: string
  srcSet: string
  urlLarge: string
  lqip: string  // Low Quality Image Placeholder (tiny blurred URL)
  alt: string
  seriesId: string
  seriesSlug: string
  seriesTitle: string
  indexInSeries: number
  totalInSeries: number
  originalWidth: number
  originalHeight: number
  aspectRatio: number
  backgroundColor: string | null
  scale?: number
}

export interface Series {
  _id: string
  title: string
  slug: string
  order: number
  gridCount: number
  description: string
  shortDescription: string
  client: string
  backgroundColor: string
  images: Array<{
    _key: string
    alt: string
    asset: any
    width: number
    height: number
  }>
}

export interface About {
  bio: string
  contacts: Array<{
    _key: string
    label: string
    value: string
    type: string
  }>
}

/**
 * Récupère toutes les données nécessaires au site
 * Appelé une seule fois au build
 */
export async function getSiteData() {
  // Fetch séries et about en parallèle
  const [series, about] = await Promise.all([
    client.fetch<Series[]>(SERIES_QUERY),
    client.fetch<About>(ABOUT_QUERY)
  ])

  // Construire la liste d'images pour la grille
  const images: GridImage[] = []

  series.forEach(serie => {
    // Prendre les X premières images selon gridCount
    const count = Math.min(serie.gridCount || 1, serie.images?.length || 0)

    for (let i = 0; i < count; i++) {
      const img = serie.images[i]
      if (img) {
        // PERFORMANCE: .auto('format') convertit PNG/JPG en WebP/AVIF selon le navigateur
        const imgBuilder = (w: number) => urlFor(img.asset).width(w).auto('format')
        // LQIP: image minuscule floutée (~500 bytes) pour placeholder
        const lqipBuilder = urlFor(img.asset).width(20).blur(50).quality(20).auto('format')

        images.push({
          id: img._key,
          url: imgBuilder(800).url(),
          // srcSet pour images adaptatives selon viewport/DPR
          srcSet: `${imgBuilder(400).url()} 400w, ${imgBuilder(800).url()} 800w, ${imgBuilder(1200).url()} 1200w`,
          urlLarge: imgBuilder(1600).url(),
          lqip: lqipBuilder.url(),
          alt: img.alt || serie.title,
          seriesId: serie._id,
          seriesSlug: serie.slug,
          seriesTitle: serie.title,
          indexInSeries: i,
          totalInSeries: serie.images.length,
          originalWidth: img.width,
          originalHeight: img.height,
          aspectRatio: img.width && img.height ? img.width / img.height : 1,
          backgroundColor: serie.backgroundColor || null
        })
      }
    }
  })

  return {
    series,
    images,
    about
  }
}
