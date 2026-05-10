import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSiteData } from '@/lib/data'
import { buildViewerData } from '@/lib/viewerData'
import { urlFor } from '@/lib/sanity'
import Grid from '@/components/Grid'

interface Props {
  params: Promise<{ slug: string; index: string }>
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
  const params: { slug: string; index: string }[] = []
  for (const s of series) {
    if (!s.slug || !s.images) continue
    for (let i = 0; i < s.images.length; i++) {
      params.push({ slug: s.slug, index: String(i + 1) })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, index } = await params
  const { series } = await getSiteData()
  const found = series.find(s => s.slug === slug)
  if (!found) return {}

  const idx0 = parseInt(index, 10) - 1
  if (isNaN(idx0) || idx0 < 0 || idx0 >= (found.images?.length ?? 0)) return {}

  const title = localizedToString(found.title)
  const desc = localizedToString(found.shortDescription) || `Série photo ${title} de Frédéric Fornini.`
  const fullTitle = `${title} #${index} — Frédéric Fornini`

  const target = found.images[idx0]
  const ogImage = target
    ? urlFor(target.asset).width(1200).height(630).fit('crop').auto('format').url()
    : undefined

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: `/${slug}/${index}` },
    openGraph: {
      title: fullTitle,
      description: desc,
      url: `/${slug}/${index}`,
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

export default async function SeriesImagePage({ params }: Props) {
  const { slug, index } = await params
  const { series, images, about, defaultBackgroundColor } = await getSiteData()
  const found = series.find(s => s.slug === slug)
  if (!found) notFound()

  const idx0 = parseInt(index, 10) - 1
  if (isNaN(idx0) || idx0 < 0 || idx0 >= (found.images?.length ?? 0)) notFound()

  const initialViewer = buildViewerData(found, idx0)

  return (
    <Grid
      series={series}
      images={images}
      about={about}
      defaultBackgroundColor={defaultBackgroundColor || undefined}
      initialOpenSlug={slug}
      initialOpenIndex={idx0}
      initialViewerData={initialViewer}
    />
  )
}
