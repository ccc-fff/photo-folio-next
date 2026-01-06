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

  // Preload des premières images pour améliorer le LCP
  // Le navigateur commence à télécharger ces images en parallèle du JS
  const preloadImages = images.slice(0, 4).map(img => {
    // Extraire l'URL 400w du srcSet (taille mobile)
    const url400 = img.srcSet.split(', ').find(s => s.includes('400w'))?.split(' ')[0]
    return url400 || img.url
  })

  return (
    <>
      {/* Preload LCP images - téléchargées en parallèle du JS */}
      {preloadImages.map((url, i) => (
        <link
          key={i}
          rel="preload"
          as="image"
          href={url}
          fetchPriority={i === 0 ? "high" : "auto"}
        />
      ))}
      <Grid series={series} images={images} about={about} />
    </>
  )
}
