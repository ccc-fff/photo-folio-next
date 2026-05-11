import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSiteData } from '@/lib/data'
import { buildViewerData } from '@/lib/viewerData'
import { urlFor } from '@/lib/sanity'
import Grid from '@/components/Grid'

interface Props {
  params: Promise<{ slug: string }>
}

function localizedToString(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'fr' in value) {
    const v = value as { fr?: string; en?: string }
    return v.fr || v.en || ''
  }
  return ''
}

export async function generateStaticParams() {
  const { series } = await getSiteData()
  return series
    .filter(s => s.slug)
    .map(s => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { series } = await getSiteData()
  const found = series.find(s => s.slug === slug)
  if (!found) return {}

  const title = localizedToString(found.title)
  const desc = localizedToString(found.shortDescription) || `Série photo ${title} de Frédéric Fornini.`
  const fullTitle = `${title} — Frédéric Fornini`

  const firstImage = found.images?.[0]
  const ogImage = firstImage
    ? urlFor(firstImage.asset).width(1200).height(630).fit('crop').auto('format').url()
    : undefined

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: fullTitle,
      description: desc,
      url: `/${slug}`,
      type: 'article',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      ...(ogImage ? { images: [ogImage] } : {})
    }
  }
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params
  const { series, images, about, defaultBackgroundColor } = await getSiteData()
  const found = series.find(s => s.slug === slug)
  if (!found) notFound()

  const initialViewer = buildViewerData(found, 0)

  return (
    <Grid
      series={series}
      images={images}
      about={about}
      defaultBackgroundColor={defaultBackgroundColor || undefined}
      initialOpenSlug={slug}
      initialViewerData={initialViewer}
    />
  )
}
