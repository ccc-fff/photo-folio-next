/**
 * URLs d'images sous le domaine du site, avec nom de fichier lisible.
 *
 * `https://cdn.sanity.io/images/<proj>/<dataset>/<hash>-<dims>.<ext>?<query>`
 * devient `/photos/<hash>-<dims>.<ext>/<nom-lisible>.jpg?<query>`.
 *
 * Le navigateur nomme un fichier enregistré (clic droit, drag and drop)
 * d'après le DERNIER segment du chemin — le hash Sanity voyage donc en
 * avant-dernier segment et un rewrite (vercel.json en prod, next.config en dev)
 * le renvoie au CDN. La query (w=, auto=format…) est transmise telle quelle.
 */
const SANITY_IMAGE_URL = /^https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([^/?]+)(\?.*)?$/

export function prettyImageUrl(sanityUrl: string, prettyName: string): string {
  const match = sanityUrl.match(SANITY_IMAGE_URL)
  if (!match) return sanityUrl
  const [, file, query] = match
  return `/photos/${file}/${prettyName}${query || ''}`
}

/** fredericfornini_<slug>_<NN>.jpg — le nom que récupèrent les visiteurs. */
export function imageFileName(seriesSlug: string, indexInSeries: number): string {
  return `fredericfornini_${seriesSlug}_${String(indexInSeries + 1).padStart(2, '0')}.jpg`
}
