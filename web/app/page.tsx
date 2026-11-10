/**
 * Page d'accueil - Portfolio photo
 *
 * Server Component : récupère les données au build (SSG)
 * puis passe au composant Grid (Client Component)
 *
 * Pas de préchargement d'images ici : la grille est tirée au hasard dans le
 * navigateur (utils/gridGenerator.ts), on ne sait donc pas au build quelles
 * images seront visibles. Les vignettes visibles au premier affichage passent
 * en priorité haute dans GridBlock (fetchPriority).
 */
import { getSiteData } from '@/lib/data'
import Grid from '@/components/Grid'

export default async function Home() {
  const { series, images, about, defaultBackgroundColor } = await getSiteData()

  return (
    <Grid series={series} images={images} about={about} defaultBackgroundColor={defaultBackgroundColor || undefined} />
  )
}
