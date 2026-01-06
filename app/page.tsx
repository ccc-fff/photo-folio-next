/**
 * Page d'accueil - Portfolio photo
 *
 * Server Component : récupère les données au build (SSG)
 * puis passe au composant Grid (Client Component)
 */
import { getSiteData } from '@/lib/data'
import Grid from '@/components/Grid'

export default async function Home() {
  const { series, images, about } = await getSiteData()

  return <Grid series={series} images={images} about={about} />
}
